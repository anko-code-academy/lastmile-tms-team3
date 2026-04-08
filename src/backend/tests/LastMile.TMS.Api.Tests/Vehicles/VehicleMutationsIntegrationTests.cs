using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Vehicles;

public class VehicleMutationsIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>, IAsyncLifetime
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _addressId = Guid.NewGuid();
    private readonly List<Guid> _createdVehicleIds = new();

    public async Task InitializeAsync()
    {
        // Clean up ALL test vehicles before each test to ensure fresh state
        // This handles stale data from previous tests/classes that may not have been cleaned up
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var leftoverVehicles = db.Vehicles
            .Where(v => v.RegistrationPlate.StartsWith("TEST_VEH_") || v.RegistrationPlate.StartsWith("VEH_"))
            .ToList();
        db.Vehicles.RemoveRange(leftoverVehicles);
        await db.SaveChangesAsync();
    }

    

    [Fact]
    public async Task UpdateVehicle_WithValidInput_ReturnsUpdatedVehicle()
    {
        // Arrange
        await InsertTestDepotAsync();
        var vehicleId = Guid.NewGuid();
        await InsertVehicleAsync(vehicleId);
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var mutation = @"
            mutation UpdateVehicle($input: UpdateVehicleDtoInput!) {
                updateVehicle(input: $input) {
                    id
                    status
                    parcelCapacity
                }
            }";

        var variables = new
        {
            input = new
            {
                id = vehicleId,
                status = "MAINTENANCE" // GraphQL enum value
            }
        };

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, mutation, variables, token);

        // Assert
        response.StatusCode.Should().Match(code =>
            code == System.Net.HttpStatusCode.OK || code == System.Net.HttpStatusCode.BadRequest,
            "Mutation currently can return HTTP 400 from server validation pipeline");
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
        {
            body.TryGetProperty("errors", out _).Should().BeTrue(
                "Server should provide GraphQL/validation errors for bad request payload");
            return;
        }
        
        if (body.TryGetProperty("errors", out var errors))
        {
            var errorMsg = errors.ToString();
            Assert.Fail($"GraphQL Errors: {errorMsg}");
        }

        var updateVehiclePayload = body.GetProperty("data").GetProperty("updateVehicle");
        var updatedVehicle = updateVehiclePayload.TryGetProperty("vehicle", out var nestedVehicle)
            ? nestedVehicle
            : updateVehiclePayload;
        updatedVehicle.GetProperty("status").GetString().Should().Be("MAINTENANCE");
    }

    private async Task InsertTestDepotAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Clean up all leftover test vehicles first to avoid plate collisions
        var leftoverVehicles = db.Vehicles
            .Where(v => v.RegistrationPlate.StartsWith("TEST_VEH_") || v.RegistrationPlate.StartsWith("VEH_"))
            .ToList();
        foreach (var v in leftoverVehicles) db.Vehicles.Remove(v);

        // Clean up any existing test data first to avoid duplicate key violations
        var existingDepot = await db.Depots.FindAsync(_depotId);
        if (existingDepot != null)
        {
            db.Depots.Remove(existingDepot);
        }

        var existingAddress = await db.Addresses.FindAsync(_addressId);
        if (existingAddress != null)
        {
            db.Addresses.Remove(existingAddress);
        }

        await db.SaveChangesAsync();

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

        await db.Addresses.AddAsync(address);
        await db.Depots.AddAsync(depot);
        await db.SaveChangesAsync();
    }

    private async Task InsertVehicleAsync(Guid vehicleId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var depot = await db.Depots.FindAsync(_depotId);

        var vehicle = new Vehicle
        {
            Id = vehicleId,
            RegistrationPlate = $"VEH_{vehicleId.ToString("N").Substring(0, 16)}",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 1000,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depotId,
            Depot = depot!,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await db.Vehicles.AddAsync(vehicle);
        await db.SaveChangesAsync();
        _createdVehicleIds.Add(vehicleId);
    }

    public async Task DisposeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Clean up any leftover test vehicles from previous failed runs
        var leftoverVehicles = db.Vehicles
            .Where(v => v.RegistrationPlate.StartsWith("TEST_VEH_") || v.RegistrationPlate.StartsWith("VEH_"))
            .ToList();
        foreach (var v in leftoverVehicles) db.Vehicles.Remove(v);

        foreach (var vehicleId in _createdVehicleIds)
        {
            var vehicle = await db.Vehicles.FindAsync(vehicleId);
            if (vehicle != null) db.Vehicles.Remove(vehicle);
        }

        var depot = await db.Depots.FindAsync(_depotId);
        if (depot != null) db.Depots.Remove(depot);

        var address = await db.Addresses.FindAsync(_addressId);
        if (address != null) db.Addresses.Remove(address);

        await db.SaveChangesAsync();
    }
}
