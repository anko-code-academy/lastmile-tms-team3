using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.AuditLogs;

[Collection("ApiWebApplication")]
public class AuditLogIntegrationTests(ApiWebApplicationFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task CreateParcel_Mutation_Creates_Searchable_Audit_Log()
    {
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);
        var trackingNumber = $"AUDIT-PARCEL-{Guid.NewGuid():N}";

        var mutation = @"
            mutation CreateParcel($input: CreateParcelDtoInput!) {
                createParcel(input: $input) {
                    id
                    trackingNumber
                    status
                }
            }";

        var variables = new
        {
            input = new
            {
                trackingNumber,
                description = "Audit test parcel",
                serviceType = "STANDARD",
                recipientAddress = new
                {
                    street1 = "123 Recipient St",
                    city = "Nashville",
                    state = "TN",
                    postalCode = "37201",
                    countryCode = "US",
                    isResidential = true,
                    contactName = "Recipient Test"
                },
                shipperAddress = new
                {
                    street1 = "456 Shipper Ave",
                    city = "Memphis",
                    state = "TN",
                    postalCode = "38103",
                    countryCode = "US",
                    isResidential = false,
                    contactName = "Shipper Test"
                },
                weight = 2.5m,
                weightUnit = "KG",
                length = 20m,
                width = 10m,
                height = 5m,
                dimensionUnit = "CM",
                declaredValue = 99.95m,
                currency = "USD",
                parcelType = "Standard"
            }
        };

        var mutationResponse = await GraphQLRequestHelper.QueryAsync(_client, mutation, variables, token);
        var mutationBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(mutationResponse);

        mutationResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        mutationBody.TryGetProperty("errors", out _).Should().BeFalse();

        var parcelId = mutationBody.GetProperty("data").GetProperty("createParcel").GetProperty("id").GetString();
        parcelId.Should().NotBeNullOrWhiteSpace();

        var auditBody = await QueryAuditLogsAsync(
            token: await GraphQLRequestHelper.GetAdminTokenAsync(_client),
            resourceType: "PARCEL",
            resourceId: parcelId,
            actionType: "CREATE");

        var node = auditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == parcelId);

        node.GetProperty("resourceType").GetString().Should().Be("PARCEL");
        node.GetProperty("actionType").GetString().Should().Be("CREATE");
        node.GetProperty("summary").GetString().Should().Contain("Parcel created");
        node.GetProperty("afterValuesJson").GetString().Should().Contain(trackingNumber);
    }

    [Fact]
    public async Task Parcel_Status_Transition_Creates_StatusTransition_Audit_Log()
    {
        var parcelId = Guid.NewGuid();
        await InsertParcelAsync(parcelId, $"AUDIT-STATUS-{Guid.NewGuid():N}", ParcelStatus.Registered);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var parcel = await db.Parcels.Include(p => p.TrackingEvents).SingleAsync(p => p.Id == parcelId);

            parcel.Status = ParcelStatus.ReceivedAtDepot;
            await db.SaveChangesAsync();
        }

        var auditBody = await QueryAuditLogsAsync(
            token: await GraphQLRequestHelper.GetAdminTokenAsync(_client),
            resourceType: "PARCEL",
            resourceId: parcelId.ToString(),
            actionType: "STATUS_TRANSITION");

        var node = auditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == parcelId.ToString());

        node.GetProperty("summary").GetString().Should().Contain("Registered").And.Contain("ReceivedAtDepot");
        node.GetProperty("beforeValuesJson").GetString().Should().Contain("Registered");
        node.GetProperty("afterValuesJson").GetString().Should().Contain("ReceivedAtDepot");
    }

    [Fact]
    public async Task CreateUser_And_DeactivateUser_Are_Searchable_In_Audit_Log()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var email = $"audit.user.{Guid.NewGuid():N}@example.com";

        var createMutation = @"
            mutation CreateUser($input: CreateUserInput!) {
                createUser(input: $input)
            }";

        var createVariables = new
        {
            input = new
            {
                firstName = "Audit",
                lastName = "User",
                email,
                role = "DISPATCHER",
                initialPassword = "Audit@12345"
            }
        };

        var createResponse = await GraphQLRequestHelper.QueryAsync(_client, createMutation, createVariables, adminToken);
        var createBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(createResponse);

        createResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        createBody.TryGetProperty("errors", out _).Should().BeFalse();

        var userId = createBody.GetProperty("data").GetProperty("createUser").GetString();
        userId.Should().NotBeNullOrWhiteSpace();

        var deactivateMutation = @"
            mutation DeactivateUser($id: UUID!) {
                deactivateUser(id: $id)
            }";

        var deactivateResponse = await GraphQLRequestHelper.QueryAsync(_client, deactivateMutation, new { id = userId }, adminToken);
        var deactivateBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(deactivateResponse);

        deactivateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        deactivateBody.TryGetProperty("errors", out _).Should().BeFalse();
        deactivateBody.GetProperty("data").GetProperty("deactivateUser").GetBoolean().Should().BeTrue();

        var createAuditBody = await QueryAuditLogsAsync(adminToken, resourceType: "USER", resourceId: userId, actionType: "CREATE", actor: "admin@lastmile.local");
        var createAuditNode = createAuditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == userId && entry.GetProperty("actionType").GetString() == "CREATE");

        createAuditNode.GetProperty("actorUserName").GetString().Should().Be("admin@lastmile.local");
        createAuditNode.GetProperty("afterValuesJson").GetString().Should().Contain(email);

        var deactivateAuditBody = await QueryAuditLogsAsync(adminToken, resourceType: "USER", resourceId: userId, actionType: "DEACTIVATE", actor: "admin@lastmile.local");
        var deactivateAuditNode = deactivateAuditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == userId && entry.GetProperty("actionType").GetString() == "DEACTIVATE");

        deactivateAuditNode.GetProperty("summary").GetString().Should().Contain("deactivated");
        deactivateAuditNode.GetProperty("beforeValuesJson").GetString().Should().Contain("true");
        deactivateAuditNode.GetProperty("afterValuesJson").GetString().Should().Contain("false");
    }

    [Fact]
    public async Task UpdateDriverStatus_Deactivate_Creates_Searchable_Audit_Log()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var driverId = await InsertDriverAsync();

        var mutation = @"
            mutation UpdateDriverStatus($input: UpdateDriverStatusDtoInput!) {
                updateDriverStatus(input: $input) {
                    id
                    isActive
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(
            _client,
            mutation,
            new
            {
                input = new
                {
                    id = driverId,
                    isActive = false
                }
            },
            adminToken);

        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();
        body.GetProperty("data").GetProperty("updateDriverStatus").GetProperty("id").GetString().Should().Be(driverId);
        body.GetProperty("data").GetProperty("updateDriverStatus").GetProperty("isActive").GetBoolean().Should().BeFalse();

        var auditBody = await QueryAuditLogsAsync(
            adminToken,
            resourceType: "DRIVER",
            resourceId: driverId,
            actionType: "DEACTIVATE",
            actor: "admin@lastmile.local");

        var auditNode = auditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == driverId && entry.GetProperty("actionType").GetString() == "DEACTIVATE");

        auditNode.GetProperty("resourceType").GetString().Should().Be("DRIVER");
        auditNode.GetProperty("summary").GetString().Should().Contain("deactivated");
        auditNode.GetProperty("beforeValuesJson").GetString().Should().Contain("true");
        auditNode.GetProperty("afterValuesJson").GetString().Should().Contain("false");
    }

    [Fact]
    public async Task AuditLogs_Can_Be_Filtered_By_Date_Range()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var markerEmail = $"audit.filter.{Guid.NewGuid():N}@example.com";
        var from = DateTimeOffset.UtcNow.AddMinutes(-1);

        await CreateUserAsync(adminToken, markerEmail);

        var auditBody = await QueryAuditLogsAsync(
            token: adminToken,
            resourceType: "USER",
            actionType: "CREATE",
            actor: "admin@lastmile.local",
            from: from.ToString("O"),
            to: DateTimeOffset.UtcNow.AddMinutes(1).ToString("O"));

        auditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Any(entry => entry.GetProperty("afterValuesJson").GetString()!.Contains(markerEmail, StringComparison.Ordinal))
            .Should().BeTrue();
    }

    [Fact]
    public async Task AuditLog_Can_Be_Queried_By_Id()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var userId = await CreateUserAsync(adminToken, $"audit.detail.{Guid.NewGuid():N}@example.com");

        var listBody = await QueryAuditLogsAsync(adminToken, resourceType: "USER", resourceId: userId, actionType: "CREATE");
        var auditLogId = listBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")
            .EnumerateArray()
            .Single(entry => entry.GetProperty("resourceId").GetString() == userId)
            .GetProperty("id")
            .GetString();

        auditLogId.Should().NotBeNullOrWhiteSpace();

        var detailQuery = @"
            query GetAuditLog($id: UUID!) {
                auditLog(id: $id) {
                    id
                    actionType
                    resourceType
                    resourceId
                    summary
                    beforeValuesJson
                    afterValuesJson
                }
            }";

        var detailResponse = await GraphQLRequestHelper.QueryAsync(_client, detailQuery, new { id = auditLogId }, adminToken);
        var detailBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(detailResponse);

        detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        detailBody.TryGetProperty("errors", out _).Should().BeFalse();

        var auditLog = detailBody.GetProperty("data").GetProperty("auditLog");
        auditLog.GetProperty("id").GetString().Should().Be(auditLogId);
        auditLog.GetProperty("actionType").GetString().Should().Be("CREATE");
        auditLog.GetProperty("resourceType").GetString().Should().Be("USER");
        auditLog.GetProperty("resourceId").GetString().Should().Be(userId);
        auditLog.GetProperty("afterValuesJson").GetString().Should().Contain(userId);
    }

    [Fact]
    public async Task AuditLog_Export_Returns_Csv()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var email = $"audit.export.{Guid.NewGuid():N}@example.com";
        var userId = await CreateUserAsync(adminToken, email);

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await _client.GetAsync($"/api/audit-logs/export?resourceType=User&resourceId={userId}");
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");
        body.Should().Contain("Occurred At (UTC),Actor User ID,Actor User Name,Action,Resource Type,Resource ID,Summary,Correlation ID,Before Values,After Values");
        body.Should().Contain(",Create,User,");
        body.Should().Contain(userId);
        body.Should().Contain(email);
    }

    [Fact]
    public async Task CreateZone_WithBoundary_Creates_Audit_Log_Without_Serialization_Errors()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var depotId = await db.Depots
            .OrderBy(d => d.Name)
            .Select(d => d.Id)
            .FirstAsync();

        var zoneId = Guid.NewGuid();
        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        db.Zones.Add(new Zone
        {
            Id = zoneId,
            Name = $"Audit Zone {zoneId:N}"[..22],
            IsActive = true,
            DepotId = depotId,
            Boundary = geometryFactory.CreatePolygon(
            [
                new Coordinate(-86.80, 36.16),
                new Coordinate(-86.78, 36.16),
                new Coordinate(-86.78, 36.18),
                new Coordinate(-86.80, 36.18),
                new Coordinate(-86.80, 36.16),
            ]),
            CreatedAt = DateTimeOffset.UtcNow,
        });

        var saveChanges = async () => await db.SaveChangesAsync();

        await saveChanges.Should().NotThrowAsync();

        var auditLog = await db.AuditLogs
            .AsNoTracking()
            .Where(log => log.ResourceType == AuditResourceType.Zone &&
                          log.ResourceId == zoneId.ToString() &&
                          log.ActionType == AuditActionType.Create)
            .OrderByDescending(log => log.OccurredAt)
            .FirstOrDefaultAsync();

        auditLog.Should().NotBeNull();
        auditLog!.AfterValuesJson.Should().Contain("POLYGON");
        auditLog.AfterValuesJson.Should().NotContain("Infinity");
    }

    [Fact]
    public async Task System_Generated_Audit_Log_Uses_Searchable_System_Actor()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var depotId = await db.Depots
            .OrderBy(d => d.Name)
            .Select(d => d.Id)
            .FirstAsync();

        var zoneId = Guid.NewGuid();
        db.Zones.Add(new Zone
        {
            Id = zoneId,
            Name = $"System Audit {zoneId:N}"[..22],
            IsActive = true,
            DepotId = depotId,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();

        var auditLog = await db.AuditLogs
            .AsNoTracking()
            .Where(log => log.ResourceType == AuditResourceType.Zone &&
                          log.ResourceId == zoneId.ToString() &&
                          log.ActionType == AuditActionType.Create)
            .OrderByDescending(log => log.OccurredAt)
            .FirstAsync();

        auditLog.ActorUserId.Should().Be("system");
        auditLog.ActorUserName.Should().Be("System");
    }

    [Fact]
    public async Task AuditLogs_Are_AppendOnly_At_The_Database_Level()
    {
        var adminToken = await GraphQLRequestHelper.GetAdminTokenAsync(_client);
        var userId = await CreateUserAsync(adminToken, $"audit.append.{Guid.NewGuid():N}@example.com");

        var auditBody = await QueryAuditLogsAsync(adminToken, resourceType: "USER", resourceId: userId, actionType: "CREATE");
        var auditLogId = auditBody.GetProperty("data").GetProperty("auditLogs").GetProperty("nodes")[0].GetProperty("id").GetString();
        auditLogId.Should().NotBeNullOrWhiteSpace();

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var update = async () => await db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE \"AuditLogs\" SET \"Summary\" = {"tampered"} WHERE \"Id\" = {Guid.Parse(auditLogId!)}");

        var delete = async () => await db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM \"AuditLogs\" WHERE \"Id\" = {Guid.Parse(auditLogId!)}");

        await update.Should().ThrowAsync<Exception>();
        await delete.Should().ThrowAsync<Exception>();
    }

    private async Task<JsonElement> QueryAuditLogsAsync(
        string token,
        string? resourceType = null,
        string? resourceId = null,
        string? actionType = null,
        string? actor = null,
        string? from = null,
        string? to = null)
    {
        var query = @"
            query AuditLogs(
                $actor: String
                $where: AuditLogFilterInput
            ) {
                auditLogs(
                    first: 50
                    actor: $actor
                    where: $where
                ) {
                    totalCount
                    nodes {
                        id
                        occurredAt
                        actorUserId
                        actorUserName
                        actionType
                        resourceType
                        resourceId
                        summary
                        beforeValuesJson
                        afterValuesJson
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(
            _client,
            query,
            BuildAuditLogQueryVariables(actor, actionType, resourceType, resourceId, from, to),
            token);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
    }

    private static object BuildAuditLogQueryVariables(
        string? actor,
        string? actionType,
        string? resourceType,
        string? resourceId,
        string? from,
        string? to)
    {
        var where = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(actionType))
            where["actionType"] = new Dictionary<string, object?> { ["eq"] = actionType };

        if (!string.IsNullOrWhiteSpace(resourceType))
            where["resourceType"] = new Dictionary<string, object?> { ["eq"] = resourceType };

        if (!string.IsNullOrWhiteSpace(resourceId))
            where["resourceId"] = new Dictionary<string, object?> { ["eq"] = resourceId };

        var occurredAt = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(from))
            occurredAt["gte"] = from;

        if (!string.IsNullOrWhiteSpace(to))
            occurredAt["lte"] = to;

        if (occurredAt.Count > 0)
            where["occurredAt"] = occurredAt;

        return new
        {
            actor,
            where = where.Count > 0 ? where : null,
        };
    }

    private async Task<string> CreateUserAsync(string adminToken, string email)
    {
        var createMutation = @"
            mutation CreateUser($input: CreateUserInput!) {
                createUser(input: $input)
            }";

        var createVariables = new
        {
            input = new
            {
                firstName = "Audit",
                lastName = "Created",
                email,
                role = "DISPATCHER",
                initialPassword = "Audit@12345"
            }
        };

        var response = await GraphQLRequestHelper.QueryAsync(_client, createMutation, createVariables, adminToken);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        return body.GetProperty("data").GetProperty("createUser").GetString()!;
    }

    private async Task<string> InsertDriverAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var driver = Driver.Create(
            firstName: "Audit",
            lastName: $"Driver{Guid.NewGuid():N}"[..12],
            phone: "+16155550199",
            email: $"audit.driver.{Guid.NewGuid():N}@example.com",
            licenseNumber: $"TN-DL-{Guid.NewGuid():N}"[..14],
            licenseExpiryDate: DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        db.Drivers.Add(driver);
        await db.SaveChangesAsync();

        return driver.Id.ToString();
    }

    private async Task InsertParcelAsync(Guid parcelId, string trackingNumber, ParcelStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Shipper Way",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            ContactName = "Shipper",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "9 Recipient Way",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            ContactName = "Recipient",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = trackingNumber,
            Status = status,
            ServiceType = ServiceType.Standard,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
            Weight = 1.25m,
            WeightUnit = WeightUnit.Kg,
            Length = 10m,
            Width = 10m,
            Height = 10m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 49.99m,
            Currency = "USD",
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Parcels.Add(parcel);
        await db.SaveChangesAsync();
    }
}
