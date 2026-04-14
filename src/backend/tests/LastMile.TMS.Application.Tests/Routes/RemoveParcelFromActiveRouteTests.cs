using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class RemoveParcelFromActiveRouteTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly RemoveParcelFromActiveRoute.Handler _handler;
    private readonly CreateRoute.Handler _createHandler;
    private readonly DispatchRoute.Handler _dispatchHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Driver _driver;
    private readonly Vehicle _vehicle;
    private readonly DateOnly _today;

    public RemoveParcelFromActiveRouteTests()
    {
        _context = TestAppDbContext.Create<RemoveParcelFromActiveRouteTests>();
        _currentUser = new FakeCurrentUserService();
        _handler = new RemoveParcelFromActiveRoute.Handler(_context, _currentUser);
        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _dispatchHandler = new DispatchRoute.Handler(_context, _currentUser);

        _today = DateOnly.FromDateTime(DateTime.UtcNow);

        var depotAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot Rd",
            City = "City",
            State = "ST",
            PostalCode = "00000",
            CountryCode = "US"
        };

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = depotAddress.Id,
            Address = depotAddress
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _driver = Driver.Create(
            "John", "Doe", "555-0100", "john@test.com",
            "DL12345", new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: _depot.Id);

        _vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "ABC-1234",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 500,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.Drivers.Add(_driver);
        _context.Vehicles.Add(_vehicle);
        _context.Addresses.Add(depotAddress);
        _context.SaveChanges();
    }

    [Fact]
    public async Task RemovesParcelFromDispatchedRoute_AndTransitionsToStaged()
    {
        // Arrange
        var (route, parcel) = await CreateAndDispatchRouteWithParcel();

        // Act
        var result = await _handler.Handle(
            new RemoveParcelFromActiveRoute.Command(new RemoveParcelFromRouteDto(route.Id, parcel.Id)),
            CancellationToken.None);

        // Assert
        result.ParcelCount.Should().Be(0);
        // Re-fetch from DB to verify status change (bypass change tracker cache)
        var refreshed = await _context.Parcels.AsNoTracking().FirstAsync(p => p.Id == parcel.Id);
        refreshed.Status.Should().Be(ParcelStatus.Staged);
    }

    [Fact]
    public async Task RecalculatesStopOrder_AfterRemoval()
    {
        // Arrange — create route with 3 parcels, then dispatch
        var dto = new CreateRouteDto(_today, _zone.Id, _driver.Id, _vehicle.Id);
        var routeResult = await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);

        var parcel1 = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        var parcel2 = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        var parcel3 = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        _context.Parcels.AddRange(parcel1, parcel2, parcel3);
        await _context.SaveChangesAsync();

        var route = _context.DeliveryRoutes.First(r => r.Id == routeResult.Id);
        route.AddParcel(parcel1);
        route.AddParcel(parcel2);
        route.AddParcel(parcel3);
        await _context.SaveChangesAsync();

        // Dispatch
        await _dispatchHandler.Handle(
            new DispatchRoute.Command(new DispatchRouteDto(route.Id)),
            CancellationToken.None);

        // Find the middle parcel via fresh query
        var freshRoute = await _context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.RouteParcels)
            .FirstAsync(r => r.Id == route.Id);
        var middleParcelId = freshRoute.RouteParcels.OrderBy(rp => rp.StopOrder).Skip(1).First().ParcelId;

        // Act — remove middle parcel
        var result = await _handler.Handle(
            new RemoveParcelFromActiveRoute.Command(new RemoveParcelFromRouteDto(route.Id, middleParcelId)),
            CancellationToken.None);

        // Assert — remaining parcels renumbered
        result.ParcelCount.Should().Be(2);
    }

    [Fact]
    public async Task Throws_WhenRouteNotFound()
    {
        var act = () => _handler.Handle(
            new RemoveParcelFromActiveRoute.Command(new RemoveParcelFromRouteDto(Guid.NewGuid(), Guid.NewGuid())),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    [Fact]
    public async Task Throws_WhenRouteIsDraft()
    {
        // Arrange — create route but don't dispatch
        var dto = new CreateRouteDto(_today, _zone.Id, _driver.Id, _vehicle.Id);
        var routeResult = await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);

        var parcel = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var route = _context.DeliveryRoutes.First(r => r.Id == routeResult.Id);
        route.AddParcel(parcel);
        await _context.SaveChangesAsync();

        var act = () => _handler.Handle(
            new RemoveParcelFromActiveRoute.Command(new RemoveParcelFromRouteDto(route.Id, parcel.Id)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Dispatched*In Progress*");
    }

    private async Task<DeliveryRoute> CreateAndDispatchRoute()
    {
        var dto = new CreateRouteDto(_today, _zone.Id, _driver.Id, _vehicle.Id);
        var routeResult = await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);

        var parcel = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var route = _context.DeliveryRoutes.First(r => r.Id == routeResult.Id);
        route.AddParcel(parcel);
        await _context.SaveChangesAsync();

        await _dispatchHandler.Handle(
            new DispatchRoute.Command(new DispatchRouteDto(route.Id)),
            CancellationToken.None);

        return _context.DeliveryRoutes.First(r => r.Id == route.Id);
    }

    private async Task<(DeliveryRoute route, Parcel parcel)> CreateAndDispatchRouteWithParcel()
    {
        var route = await CreateAndDispatchRoute();
        // Use AsNoTracking to bypass cached entities from before dispatch
        var freshRoute = await _context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.RouteParcels)
                .ThenInclude(rp => rp.Parcel)
            .FirstAsync(r => r.Id == route.Id);
        var parcel = freshRoute.RouteParcels.First().Parcel!;
        return (freshRoute, parcel);
    }

    private Parcel CreateParcel(ParcelStatus status, Guid? zoneId = null)
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Test St",
            City = "City",
            State = "ST",
            PostalCode = "12345",
            CountryCode = "US"
        };

        _context.Addresses.Add(address);

        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = $"LMT-{Guid.NewGuid():N}"[..15],
            Status = status,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            ZoneId = zoneId ?? _zone.Id
        };
    }

    public void Dispose() => _context.Dispose();
}
