using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class AssignVehicleToRouteTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly CreateRoute.Handler _createHandler;
    private readonly AssignVehicleToRoute.Handler _assignVehicleHandler;
    private readonly UnassignVehicleFromRoute.Handler _unassignVehicleHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Vehicle _vehicle1;
    private readonly Vehicle _vehicle2;

    public AssignVehicleToRouteTests()
    {
        _context = TestAppDbContext.Create<AssignVehicleToRouteTests>();
        _currentUser = new FakeCurrentUserService();

        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _assignVehicleHandler = new AssignVehicleToRoute.Handler(_context);
        _unassignVehicleHandler = new UnassignVehicleFromRoute.Handler(_context);

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            Address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "1 Depot Rd",
                City = "City",
                State = "ST",
                PostalCode = "00000",
                CountryCode = "US"
            }
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _vehicle1 = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "RT-0001",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 500,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _vehicle2 = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "RT-0002",
            Type = VehicleType.Car,
            Status = VehicleStatus.Available,
            ParcelCapacity = 30,
            WeightCapacity = 300,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.Vehicles.AddRange(_vehicle1, _vehicle2);
        _context.SaveChanges();
    }

    [Fact]
    public async Task AssignVehicle_WithValidVehicle_AssignsSuccessfully()
    {
        // Arrange — create route without a vehicle
        var route = await CreateTestRoute(vehicleId: null);
        var dto = new AssignVehicleToRouteDto(route.Id, _vehicle1.Id);

        // Act
        var result = await _assignVehicleHandler.Handle(
            new AssignVehicleToRoute.Command(dto), CancellationToken.None);

        // Assert
        result.VehicleId.Should().Be(_vehicle1.Id);
        result.VehiclePlate.Should().Be("RT-0001");
    }

    [Fact]
    public async Task AssignVehicle_Throws_WhenRouteNotFound()
    {
        // Arrange
        var dto = new AssignVehicleToRouteDto(Guid.NewGuid(), _vehicle1.Id);

        // Act
        var act = () => _assignVehicleHandler.Handle(
            new AssignVehicleToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Route*not found*");
    }

    [Fact]
    public async Task AssignVehicle_Throws_WhenVehicleNotFound()
    {
        // Arrange
        var route = await CreateTestRoute(vehicleId: null);
        var dto = new AssignVehicleToRouteDto(route.Id, Guid.NewGuid());

        // Act
        var act = () => _assignVehicleHandler.Handle(
            new AssignVehicleToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Vehicle*not found*");
    }

    [Fact]
    public async Task AssignVehicle_Throws_WhenRouteNotDraft()
    {
        // Arrange
        var route = await CreateTestRoute(vehicleId: null);
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        var dto = new AssignVehicleToRouteDto(route.Id, _vehicle1.Id);

        // Act
        var act = () => _assignVehicleHandler.Handle(
            new AssignVehicleToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public async Task AssignVehicle_Reassigns_WhenAlreadyAssigned()
    {
        // Arrange — create route with vehicle1
        var route = await CreateTestRoute(vehicleId: _vehicle1.Id);
        route.VehicleId.Should().Be(_vehicle1.Id);

        // Act — reassign to vehicle2
        var dto = new AssignVehicleToRouteDto(route.Id, _vehicle2.Id);
        var result = await _assignVehicleHandler.Handle(
            new AssignVehicleToRoute.Command(dto), CancellationToken.None);

        // Assert
        result.VehicleId.Should().Be(_vehicle2.Id);
        result.VehiclePlate.Should().Be("RT-0002");
    }

    [Fact]
    public async Task UnassignVehicle_ClearsAssignment()
    {
        // Arrange — create route with vehicle
        var route = await CreateTestRoute(vehicleId: _vehicle1.Id);
        route.VehicleId.Should().Be(_vehicle1.Id);

        // Act
        var result = await _unassignVehicleHandler.Handle(
            new UnassignVehicleFromRoute.Command(new UnassignFromRouteDto(route.Id)),
            CancellationToken.None);

        // Assert
        result.VehicleId.Should().BeNull();
        result.VehiclePlate.Should().BeNull();
    }

    [Fact]
    public async Task UnassignVehicle_Throws_WhenRouteNotDraft()
    {
        // Arrange
        var route = await CreateTestRoute(vehicleId: _vehicle1.Id);
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        // Act
        var act = () => _unassignVehicleHandler.Handle(
            new UnassignVehicleFromRoute.Command(new UnassignFromRouteDto(route.Id)),
            CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    private async Task<RouteDto> CreateTestRoute(Guid? vehicleId = null)
    {
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            null,
            vehicleId);

        return await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);
    }

    public void Dispose() => _context.Dispose();
}
