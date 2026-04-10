using System.Linq;
using System.Text.Json;
using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace LastMile.TMS.Api.Tests.DeliveryRoutes;

public class LoadOutIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    [Fact]
    public async Task LoadParcel_Should_TransitionParcelToLoaded()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        Guid routeId;
        string trackingNumber;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "123 Load Test St",
                City = "LoadCity",
                State = "LS",
                PostalCode = "12345",
                CountryCode = "US",
                CreatedAt = DateTimeOffset.UtcNow
            };

            var depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Load Test Depot",
                AddressId = address.Id,
                Address = address,
                IsActive = true,
                OperatingHours = new OperatingHours(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            routeId = Guid.NewGuid();
            trackingNumber = $"LOAD-{Guid.NewGuid():N}"[..16];

            var route = new DeliveryRoute
            {
                Id = routeId,
                Name = "Load Test Route",
                DepotId = depot.Id,
                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = RouteStatus.Draft
            };

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = trackingNumber,
                ServiceType = ServiceType.Standard,
                Status = ParcelStatus.Staged,
                ShipperAddressId = address.Id,
                ShipperAddress = address,
                RecipientAddressId = address.Id,
                RecipientAddress = address,
                Weight = 5.0m,
                WeightUnit = WeightUnit.Kg,
                Length = 30.0m,
                Width = 20.0m,
                Height = 15.0m,
                DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = 100.0m,
                Currency = "USD",
                RouteId = routeId
            };

            db.Addresses.Add(address);
            db.Depots.Add(depot);
            db.DeliveryRoutes.Add(route);
            db.Parcels.Add(parcel);
            await db.SaveChangesAsync();
        }

        var mutation = """
            mutation LoadParcel($input: LoadParcelDtoInput!) {
              loadParcel(input: $input) {
                parcelId
                trackingNumber
                status
                isWrongRoute
                assignedRouteName
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client,
            mutation,
            new
            {
                input = new
                {
                    trackingNumber,
                    routeId,
                    operatorName = "TestAdmin",
                    locationCity = "LoadCity",
                    locationState = "LS",
                    locationCountryCode = "US"
                }
            },
            token);

        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("loadParcel");
        data.GetProperty("status").GetString().Should().Be("LOADED");
        data.GetProperty("isWrongRoute").GetBoolean().Should().BeFalse();
        data.GetProperty("trackingNumber").GetString().Should().Be(trackingNumber);
    }

    [Fact]
    public async Task CompleteLoading_WithUnloadedParcels_Should_ReturnAlertWithoutCompleting()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        Guid routeId;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "123 Complete Test St",
                City = "CompleteCity",
                State = "CS",
                PostalCode = "12345",
                CountryCode = "US",
                CreatedAt = DateTimeOffset.UtcNow
            };

            var depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Complete Test Depot",
                AddressId = address.Id,
                Address = address,
                IsActive = true,
                OperatingHours = new OperatingHours(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            routeId = Guid.NewGuid();
            var route = new DeliveryRoute
            {
                Id = routeId,
                Name = "Complete Test Route",
                DepotId = depot.Id,
                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = RouteStatus.Draft
            };

            // One loaded, one staged (unloaded)
            var parcels = new[]
            {
                new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"CMP-LOADED-{Guid.NewGuid():N}"[..16],
                    ServiceType = ServiceType.Standard,
                    Status = ParcelStatus.Loaded,
                    ShipperAddressId = address.Id,
                    ShipperAddress = address,
                    RecipientAddressId = address.Id,
                    RecipientAddress = address,
                    Weight = 5.0m,
                    WeightUnit = WeightUnit.Kg,
                    Length = 30.0m,
                    Width = 20.0m,
                    Height = 15.0m,
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = 100.0m,
                    Currency = "USD",
                    RouteId = routeId
                },
                new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"CMP-STAGED-{Guid.NewGuid():N}"[..16],
                    ServiceType = ServiceType.Standard,
                    Status = ParcelStatus.Staged,
                    ShipperAddressId = address.Id,
                    ShipperAddress = address,
                    RecipientAddressId = address.Id,
                    RecipientAddress = address,
                    Weight = 3.0m,
                    WeightUnit = WeightUnit.Kg,
                    Length = 20.0m,
                    Width = 15.0m,
                    Height = 10.0m,
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = 50.0m,
                    Currency = "USD",
                    RouteId = routeId
                }
            };

            db.Addresses.Add(address);
            db.Depots.Add(depot);
            db.DeliveryRoutes.Add(route);
            db.Parcels.AddRange(parcels);
            await db.SaveChangesAsync();
        }

        var mutation = """
            mutation CompleteLoading($input: CompleteLoadingDtoInput!) {
              completeLoading(input: $input) {
                routeId
                isSuccess
                hasUnloadedParcels
                unloadedParcelCount
                unloadedParcels {
                  trackingNumber
                }
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client,
            mutation,
            new
            {
                input = new
                {
                    routeId,
                    operatorName = "TestAdmin"
                }
            },
            token);

        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("completeLoading");
        data.GetProperty("isSuccess").GetBoolean().Should().BeFalse();
        data.GetProperty("hasUnloadedParcels").GetBoolean().Should().BeTrue();
        data.GetProperty("unloadedParcelCount").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task GetDeliveryRoutes_Should_ReturnRoutesWithParcels()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var testDate = DateOnly.FromDateTime(DateTime.UtcNow);
        var routeId = Guid.NewGuid();
        var routeName = $"ROUTE-QRY-{Guid.NewGuid():N}"[..16];

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "123 Route Query St",
                City = "RouteCity",
                State = "RS",
                PostalCode = "12345",
                CountryCode = "US",
                CreatedAt = DateTimeOffset.UtcNow
            };

            var depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Route Query Depot",
                AddressId = address.Id,
                Address = address,
                IsActive = true,
                OperatingHours = new OperatingHours(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            var route = new DeliveryRoute
            {
                Id = routeId,
                Name = routeName,
                DepotId = depot.Id,
                Date = testDate,
                Status = RouteStatus.Draft
            };

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"RTQ-{Guid.NewGuid():N}"[..16],
                ServiceType = ServiceType.Standard,
                Status = ParcelStatus.Staged,
                ShipperAddressId = address.Id,
                ShipperAddress = address,
                RecipientAddressId = address.Id,
                RecipientAddress = address,
                Weight = 5.0m,
                WeightUnit = WeightUnit.Kg,
                Length = 30.0m,
                Width = 20.0m,
                Height = 15.0m,
                DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = 100.0m,
                Currency = "USD",
                RouteId = routeId
            };

            db.Addresses.Add(address);
            db.Depots.Add(depot);
            db.DeliveryRoutes.Add(route);
            db.Parcels.Add(parcel);
            await db.SaveChangesAsync();
        }

        var query = """
            query {
                deliveryRoutes(first: 100) {
                    totalCount
                    nodes {
                        id
                        name
                        status
                    }
                }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client,
            query,
            null,
            token);

        var rawBody = await response.Content.ReadAsStringAsync();
        var body = JsonDocument.Parse(rawBody).RootElement;

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK, $"Response body: {rawBody}");
        body.TryGetProperty("errors", out var queryErrors).Should().BeFalse($"GraphQL errors: {queryErrors}");

        var data = body.GetProperty("data").GetProperty("deliveryRoutes");
        var totalCount = data.GetProperty("totalCount").GetInt32();
        totalCount.Should().BeGreaterThanOrEqualTo(1);

        var nodesList = data.GetProperty("nodes").EnumerateArray().ToList();
        var routeNode = nodesList.FirstOrDefault(n =>
            Guid.Parse(n.GetProperty("id").GetString()!) == routeId);
        routeNode.ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Undefined,
            $"route {routeId} not found in {totalCount} routes. Raw: {rawBody}");
    }
}
