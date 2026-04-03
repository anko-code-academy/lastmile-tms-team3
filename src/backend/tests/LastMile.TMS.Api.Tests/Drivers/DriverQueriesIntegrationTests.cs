using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Drivers;

public class DriverQueriesIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>, IAsyncDisposable
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly Guid _addressId = Guid.NewGuid();
    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _driverId1 = Guid.NewGuid();
    private readonly Guid _driverId2 = Guid.NewGuid();
    private string DriverOneSearchPrefix => $"ali{_driverId1.ToString("N")[..6]}";
    private string DriverOneFirstName => $"{DriverOneSearchPrefix}x";
    private string DriverOneEmail => $"{DriverOneSearchPrefix}@example.com";
    private string DriverOneLicenseNumber => $"DL{_driverId1.ToString("N")[..8].ToUpperInvariant()}";
    private string DriverTwoFirstName => $"bob{_driverId2.ToString("N")[..6]}x";
    private string DriverTwoEmail => $"bob{_driverId2.ToString("N")[..6]}@example.com";
    private string DriverTwoLicenseNumber => $"DL{_driverId2.ToString("N")[..8].ToUpperInvariant()}";

    [Fact]
    public async Task Drivers_Search_MatchesConfiguredPrefixFields()
    {
        await InsertTestDriversAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetDrivers($search: String!, $depotId: UUID!) {
                drivers(first: 10, search: $search, where: { depotId: { eq: $depotId } }, order: [{ createdAt: ASC }]) {
                    totalCount
                    nodes {
                        id
                        firstName
                        email
                        licenseNumber
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(
            _client,
            query,
            new { search = DriverOneSearchPrefix, depotId = _depotId },
            token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var drivers = body.GetProperty("data").GetProperty("drivers");
        drivers.GetProperty("totalCount").GetInt32().Should().Be(1);
        drivers.GetProperty("nodes")[0].GetProperty("id").GetString().Should().Be(_driverId1.ToString());
    }

    [Fact]
    public async Task Drivers_Filter_And_Sort_WorkServerSide()
    {
        await InsertTestDriversAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetDrivers($depotId: UUID!) {
                drivers(
                    first: 10
                    where: { isActive: { eq: true }, depotId: { eq: $depotId } }
                    order: [{ email: DESC }]
                ) {
                    totalCount
                    nodes {
                        id
                        email
                        isActive
                        depotId
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { depotId = _depotId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var drivers = body.GetProperty("data").GetProperty("drivers");
        drivers.GetProperty("totalCount").GetInt32().Should().Be(1);
        var node = drivers.GetProperty("nodes")[0];
        node.GetProperty("id").GetString().Should().Be(_driverId1.ToString());
        node.GetProperty("isActive").GetBoolean().Should().BeTrue();
        node.GetProperty("depotId").GetString().Should().Be(_depotId.ToString());
    }

    [Fact]
    public async Task Drivers_Paging_UsesStableServerOrder()
    {
        await InsertTestDriversAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var firstPageQuery = @"
            query GetDrivers($depotId: UUID!) {
                drivers(first: 1, where: { depotId: { eq: $depotId } }, order: [{ createdAt: ASC }]) {
                    nodes {
                        id
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }";

        var firstResponse = await GraphQLRequestHelper.QueryAsync(_client, firstPageQuery, new { depotId = _depotId }, token);
        var firstBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(firstResponse);

        firstResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        firstBody.TryGetProperty("errors", out _).Should().BeFalse();

        var firstDrivers = firstBody.GetProperty("data").GetProperty("drivers");
        firstDrivers.GetProperty("nodes")[0].GetProperty("id").GetString().Should().Be(_driverId1.ToString());
        firstDrivers.GetProperty("pageInfo").GetProperty("hasNextPage").GetBoolean().Should().BeTrue();

        var endCursor = firstDrivers.GetProperty("pageInfo").GetProperty("endCursor").GetString();

        var secondPageQuery = @"
            query GetDrivers($depotId: UUID!, $after: String) {
                drivers(first: 1, after: $after, where: { depotId: { eq: $depotId } }, order: [{ createdAt: ASC }]) {
                    nodes {
                        id
                    }
                }
            }";

        var secondResponse = await GraphQLRequestHelper.QueryAsync(
            _client,
            secondPageQuery,
            new { depotId = _depotId, after = endCursor },
            token);
        var secondBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(secondResponse);

        secondResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        secondBody.TryGetProperty("errors", out _).Should().BeFalse();

        secondBody.GetProperty("data").GetProperty("drivers").GetProperty("nodes")[0].GetProperty("id").GetString()
            .Should().Be(_driverId2.ToString());
    }

    [Fact]
    public async Task GetDriver_ReturnsCamelCaseComputedFields()
    {
        await InsertTestDriversAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetDriver($id: UUID!) {
                driver(id: $id) {
                    id
                    fullName
                    availability {
                        schedule {
                            dayOfWeek
                        }
                        daysOff {
                            date
                        }
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { id = _driverId1 }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var driver = body.GetProperty("data").GetProperty("driver");
        driver.GetProperty("id").GetString().Should().Be(_driverId1.ToString());
        driver.GetProperty("fullName").GetString().Should().Be($"{DriverOneFirstName} Zephyr");
        driver.GetProperty("availability").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Object);
    }

    private async Task InsertTestDriversAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await db.Drivers.FindAsync(_driverId1) != null)
        {
            return;
        }

        var address = new Address
        {
            Id = _addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US",
            IsResidential = false,
            GeoLocation = new Point(-73.935242, 40.730610) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Driver Depot",
            AddressId = _addressId,
            Address = address,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var driver1 = Driver.Create(
            DriverOneFirstName,
            "Zephyr",
            "+1111111111",
            DriverOneEmail,
            DriverOneLicenseNumber,
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            depotId: _depotId);
        driver1.GetType().GetProperty("Id")!.SetValue(driver1, _driverId1);
        driver1.CreatedAt = new DateTimeOffset(2026, 4, 1, 8, 0, 0, TimeSpan.Zero);

        var driver2 = Driver.Create(
            DriverTwoFirstName,
            "Yellow",
            "+2222222222",
            DriverTwoEmail,
            DriverTwoLicenseNumber,
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        driver2.GetType().GetProperty("Id")!.SetValue(driver2, _driverId2);
        driver2.Deactivate();
        driver2.AssignDepot(_depotId);
        driver2.CreatedAt = new DateTimeOffset(2026, 4, 2, 8, 0, 0, TimeSpan.Zero);

        await db.Addresses.AddAsync(address);
        await db.Depots.AddAsync(depot);
        await db.Drivers.AddRangeAsync(driver1, driver2);
        await db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var additionalDrivers = await db.Drivers
            .Where(driver => driver.DepotId == _depotId && driver.Id != _driverId1 && driver.Id != _driverId2)
            .ToListAsync();
        if (additionalDrivers.Count > 0)
        {
            db.Drivers.RemoveRange(additionalDrivers);
        }

        var driver1 = await db.Drivers.FindAsync(_driverId1);
        if (driver1 != null) db.Drivers.Remove(driver1);

        var driver2 = await db.Drivers.FindAsync(_driverId2);
        if (driver2 != null) db.Drivers.Remove(driver2);

        var depot = await db.Depots.FindAsync(_depotId);
        if (depot != null) db.Depots.Remove(depot);

        var address = await db.Addresses.FindAsync(_addressId);
        if (address != null) db.Addresses.Remove(address);

        await db.SaveChangesAsync();
    }
}