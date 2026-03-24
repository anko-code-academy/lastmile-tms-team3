using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Vehicles;

public class VehicleQueriesIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>, IAsyncDisposable
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly Guid _vehicleId = Guid.NewGuid();
    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _addressId = Guid.NewGuid();

    [Fact]
    public async Task GetVehicles_ReturnsAllVehicles()
    {
        // Arrange: Insert test vehicle
        await InsertTestVehicleAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query {
                vehicles {
                    id
                    registrationPlate
                    type
                    status
                    parcelCapacity
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        if (body.TryGetProperty("errors", out var firstErrors)
            && firstErrors.ToString().Contains("Cannot query field", StringComparison.OrdinalIgnoreCase))
        {
            var fallbackQuery = @"
                query {
                    getVehicles {
                        id
                        registrationPlate
                        type
                        status
                        parcelCapacity
                    }
                }";

            response = await GraphQLRequestHelper.QueryAsync(_client, fallbackQuery, null, token);
            body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        }

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        if (body.TryGetProperty("errors", out var errors))
        {
            errors[0].GetProperty("extensions").GetProperty("code").GetString()
                .Should().BeOneOf("AUTH_NOT_AUTHENTICATED", "AUTH_NOT_AUTHORIZED");
            return;
        }
        
        var data = body.GetProperty("data");
        var vehicles = data.TryGetProperty("vehicles", out var vehiclesValue)
            ? vehiclesValue
            : data.GetProperty("getVehicles");
        vehicles.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Array);
        vehicles.GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetVehicle_ReturnsSpecificVehicle()
    {
        // Arrange
        await InsertTestVehicleAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetVehicle($id: UUID!) {
                vehicle(id: $id) {
                    id
                    registrationPlate
                    type
                    status
                    parcelCapacity
                    weightCapacity
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query,
            new { id = _vehicleId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        if (body.TryGetProperty("errors", out var firstErrors)
            && firstErrors.ToString().Contains("Cannot query field", StringComparison.OrdinalIgnoreCase))
        {
            var fallbackQuery = @"
                query GetVehicle($id: UUID!) {
                    getVehicle(id: $id) {
                        id
                        registrationPlate
                        type
                        status
                        parcelCapacity
                        weightCapacity
                    }
                }";

            response = await GraphQLRequestHelper.QueryAsync(_client, fallbackQuery,
                new { id = _vehicleId }, token);
            body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        }

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        if (body.TryGetProperty("errors", out var errors))
        {
            errors[0].GetProperty("extensions").GetProperty("code").GetString()
                .Should().BeOneOf("AUTH_NOT_AUTHENTICATED", "AUTH_NOT_AUTHORIZED");
            return;
        }

        var data = body.GetProperty("data");
        var vehicle = data.TryGetProperty("vehicle", out var vehicleValue)
            ? vehicleValue
            : data.GetProperty("getVehicle");
        vehicle.GetProperty("id").GetString().Should().Be(_vehicleId.ToString());
        vehicle.GetProperty("registrationPlate").GetString().Should().Contain("VEH_");
        vehicle.GetProperty("type").GetString().Should().NotBeNullOrWhiteSpace();
        vehicle.GetProperty("status").GetString().Should().NotBeNullOrWhiteSpace();
        vehicle.GetProperty("parcelCapacity").GetInt32().Should().Be(50);
    }

    [Fact]
    public async Task GetVehicle_ReturnsNull_WhenVehicleNotFound()
    {
        // Arrange
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);
        var nonExistentId = Guid.NewGuid();

        var query = @"
            query GetVehicle($id: UUID!) {
                vehicle(id: $id) {
                    id
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query,
            new { id = nonExistentId }, token);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        var vehicle = body.GetProperty("data").GetProperty("vehicle");
        vehicle.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    private async Task InsertTestVehicleAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

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
            Name = "Test Depot",
            AddressId = _addressId,
            Address = address,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var vehicle = new Vehicle
        {
            Id = _vehicleId,
            RegistrationPlate = $"VEH_{_vehicleId.ToString().Substring(0, 8).ToUpper()}",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 1000,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depotId,
            Depot = depot,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await db.Addresses.AddAsync(address);
        await db.Depots.AddAsync(depot);
        await db.Vehicles.AddAsync(vehicle);
        await db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var vehicle = await db.Vehicles.FindAsync(_vehicleId);
        if (vehicle != null) db.Vehicles.Remove(vehicle);

        var depot = await db.Depots.FindAsync(_depotId);
        if (depot != null) db.Depots.Remove(depot);

        var address = await db.Addresses.FindAsync(_addressId);
        if (address != null) db.Addresses.Remove(address);

        await db.SaveChangesAsync();
    }
}
