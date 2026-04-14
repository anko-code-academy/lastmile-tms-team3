using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Drivers.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;
using System.Text.Json;

namespace LastMile.TMS.Application.Tests.Routes;

public class AddParcelsToActiveRouteTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly AddParcelsToActiveRoute.Handler _handler;
    private readonly CreateRoute.Handler _createHandler;
    private readonly DispatchRoute.Handler _dispatchHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Driver _driver;
    private readonly Vehicle _vehicle;
    private readonly DateOnly _today;

    public AddParcelsToActiveRouteTests()
    {
        _context = TestAppDbContext.Create<AddParcelsToActiveRouteTests>();
        _currentUser = new FakeCurrentUserService();
        _handler = new AddParcelsToActiveRoute.Handler(_context, _currentUser);
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
    public async Task AddsStagedParcelToDispatchedRoute_AndTransitionsToOutForDelivery()
    {
        // Arrange — create and dispatch a route with one parcel
        var route = await CreateAndDispatchRoute();

        // Verify the route is dispatched
        var dbRoute = await _context.DeliveryRoutes.AsNoTracking().FirstAsync(r => r.Id == route.Id);
        dbRoute.Status.Should().Be(RouteStatus.Dispatched);

        // Create a staged parcel
        var stagedParcel = CreateParcel(ParcelStatus.Staged, _zone.Id);
        _context.Parcels.Add(stagedParcel);
        _context.SaveChanges();

        // Act
        var result = await _handler.Handle(
            new AddParcelsToActiveRoute.Command(new AddParcelsToRouteDto(route.Id, [stagedParcel.Id], "Test reason")),
            CancellationToken.None);

        // Assert
        result.ParcelCount.Should().Be(2);
        // Re-fetch from DB to verify status change (bypass change tracker cache)
        var refreshed = await _context.Parcels.AsNoTracking().FirstAsync(p => p.Id == stagedParcel.Id);
        refreshed.Status.Should().Be(ParcelStatus.OutForDelivery);
    }

    [Fact]
    public async Task DoesNotAddParcelAlreadyOnAnotherRoute()
    {
        // Arrange
        var route = await CreateAndDispatchRoute();
        var otherRoute = await CreateAndDispatchRoute();

        // Create a staged parcel and assign to otherRoute
        var parcel = CreateParcel(ParcelStatus.Staged, _zone.Id);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();

        // Manually add to otherRoute
        var rp = new RouteParcel
        {
            RouteId = otherRoute.Id,
            ParcelId = parcel.Id,
            StopOrder = 99,
            AddedAt = DateTimeOffset.UtcNow
        };
        _context.RouteParcels.Add(rp);
        _context.SaveChanges();

        // Act — try to add to route (should be skipped)
        var result = await _handler.Handle(
            new AddParcelsToActiveRoute.Command(new AddParcelsToRouteDto(route.Id, [parcel.Id], "Test reason")),
            CancellationToken.None);

        // Assert — parcel not added
        result.ParcelCount.Should().Be(1);
    }

    [Fact]
    public async Task Throws_WhenRouteNotFound()
    {
        var act = () => _handler.Handle(
            new AddParcelsToActiveRoute.Command(new AddParcelsToRouteDto(Guid.NewGuid(), [], "Test reason")),
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

        var stagedParcel = CreateParcel(ParcelStatus.Staged, _zone.Id);
        _context.Parcels.Add(stagedParcel);
        _context.SaveChanges();

        var act = () => _handler.Handle(
            new AddParcelsToActiveRoute.Command(new AddParcelsToRouteDto(routeResult.Id, [stagedParcel.Id], "Test reason")),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Dispatched*In Progress*");
    }

    [Fact]
    public async Task CreatesAuditLog_WhenParcelsAddedToActiveRoute()
    {
        // Arrange
        var route = await CreateAndDispatchRoute();
        var stagedParcel = CreateParcel(ParcelStatus.Staged, _zone.Id);
        _context.Parcels.Add(stagedParcel);
        _context.SaveChanges();

        var reason = "Customer requested additional pickup";

        // Act
        await _handler.Handle(
            new AddParcelsToActiveRoute.Command(
                new AddParcelsToRouteDto(route.Id, [stagedParcel.Id], reason)),
            CancellationToken.None);

        // Assert
        var auditLog = await _context.AuditLogs
            .FirstOrDefaultAsync(a =>
                a.ResourceType == AuditResourceType.DeliveryRoute &&
                a.ResourceId == route.Id.ToString());

        auditLog.Should().NotBeNull();
        auditLog!.ActionType.Should().Be(AuditActionType.Update);
        auditLog.OccurredAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
        auditLog.ActorUserId.Should().Be("test-user-id");
        auditLog.ActorUserName.Should().Be("testuser");
        auditLog.Summary.Should().Be(reason);
        auditLog.BeforeValuesJson.Should().NotBeNull();
        auditLog.AfterValuesJson.Should().NotBeNull();
    }

    [Fact]
    public async Task Throws_WhenReasonIsEmpty_AndAddingToActiveRoute()
    {
        var route = await CreateAndDispatchRoute();
        var stagedParcel = CreateParcel(ParcelStatus.Staged, _zone.Id);
        _context.Parcels.Add(stagedParcel);
        _context.SaveChanges();

        var act = () => _handler.Handle(
            new AddParcelsToActiveRoute.Command(
                new AddParcelsToRouteDto(route.Id, [stagedParcel.Id], "")),
            CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*reason*");
    }

    private async Task<DeliveryRoute> CreateAndDispatchRoute()
    {
        var dto = new CreateRouteDto(_today, _zone.Id, _driver.Id, _vehicle.Id);
        var routeResult = await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);

        // Add a loaded parcel
        var parcel = CreateParcel(ParcelStatus.Loaded, _zone.Id);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var route = _context.DeliveryRoutes.First(r => r.Id == routeResult.Id);
        route.AddParcel(parcel);
        await _context.SaveChangesAsync();

        // Dispatch
        await _dispatchHandler.Handle(
            new DispatchRoute.Command(new DispatchRouteDto(route.Id)),
            CancellationToken.None);

        return _context.DeliveryRoutes.First(r => r.Id == route.Id);
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
