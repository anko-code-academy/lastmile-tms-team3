using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class AssignDriverToRouteTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly CreateRoute.Handler _createHandler;
    private readonly AssignDriverToRoute.Handler _assignDriverHandler;
    private readonly UnassignDriverFromRoute.Handler _unassignDriverHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Driver _driver1;
    private readonly Driver _driver2;

    public AssignDriverToRouteTests()
    {
        _context = TestAppDbContext.Create<AssignDriverToRouteTests>();
        _currentUser = new FakeCurrentUserService();

        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _assignDriverHandler = new AssignDriverToRoute.Handler(_context);
        _unassignDriverHandler = new UnassignDriverFromRoute.Handler(_context);

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

        _driver1 = Driver.Create(
            "John", "Doe", "555-0100", "john@test.com",
            "DL-001", new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: _depot.Id);

        _driver2 = Driver.Create(
            "Jane", "Smith", "555-0200", "jane@test.com",
            "DL-002", new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: _depot.Id);

        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.Drivers.AddRange(_driver1, _driver2);
        _context.SaveChanges();
    }

    [Fact]
    public async Task AssignDriver_WithValidDriver_AssignsSuccessfully()
    {
        // Arrange — create route without a driver
        var route = await CreateTestRoute(driverId: null);
        var dto = new AssignDriverToRouteDto(route.Id, _driver1.Id);

        // Act
        var result = await _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        result.DriverId.Should().Be(_driver1.Id);
        result.DriverName.Should().Be("John Doe");
    }

    [Fact]
    public async Task AssignDriver_Throws_WhenRouteNotFound()
    {
        // Arrange
        var dto = new AssignDriverToRouteDto(Guid.NewGuid(), _driver1.Id);

        // Act
        var act = () => _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Route*not found*");
    }

    [Fact]
    public async Task AssignDriver_Throws_WhenDriverNotFound()
    {
        // Arrange
        var route = await CreateTestRoute(driverId: null);
        var dto = new AssignDriverToRouteDto(route.Id, Guid.NewGuid());

        // Act
        var act = () => _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Driver*not found*");
    }

    [Fact]
    public async Task AssignDriver_Throws_WhenDriverNotActive()
    {
        // Arrange
        _driver1.Deactivate();
        await _context.SaveChangesAsync();

        var route = await CreateTestRoute(driverId: null);
        var dto = new AssignDriverToRouteDto(route.Id, _driver1.Id);

        // Act
        var act = () => _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not active*");
    }

    [Fact]
    public async Task AssignDriver_Throws_WhenRouteNotDraft()
    {
        // Arrange — create and dispatch a route
        var route = await CreateTestRoute(driverId: null);
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        var dto = new AssignDriverToRouteDto(route.Id, _driver1.Id);

        // Act
        var act = () => _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public async Task AssignDriver_Reassigns_WhenAlreadyAssigned()
    {
        // Arrange — create route with driver1
        var route = await CreateTestRoute(driverId: _driver1.Id);
        route.DriverId.Should().Be(_driver1.Id);

        // Act — reassign to driver2
        var dto = new AssignDriverToRouteDto(route.Id, _driver2.Id);
        var result = await _assignDriverHandler.Handle(
            new AssignDriverToRoute.Command(dto), CancellationToken.None);

        // Assert
        result.DriverId.Should().Be(_driver2.Id);
        result.DriverName.Should().Be("Jane Smith");
    }

    [Fact]
    public async Task UnassignDriver_ClearsAssignment()
    {
        // Arrange — create route with driver
        var route = await CreateTestRoute(driverId: _driver1.Id);
        route.DriverId.Should().Be(_driver1.Id);

        // Act
        var result = await _unassignDriverHandler.Handle(
            new UnassignDriverFromRoute.Command(new UnassignFromRouteDto(route.Id)),
            CancellationToken.None);

        // Assert
        result.DriverId.Should().BeNull();
        result.DriverName.Should().BeNull();
    }

    [Fact]
    public async Task UnassignDriver_Throws_WhenRouteNotDraft()
    {
        // Arrange
        var route = await CreateTestRoute(driverId: _driver1.Id);
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        // Act
        var act = () => _unassignDriverHandler.Handle(
            new UnassignDriverFromRoute.Command(new UnassignFromRouteDto(route.Id)),
            CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    private async Task<RouteDto> CreateTestRoute(Guid? driverId = null)
    {
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            driverId,
            null);

        return await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);
    }

    public void Dispose() => _context.Dispose();
}
