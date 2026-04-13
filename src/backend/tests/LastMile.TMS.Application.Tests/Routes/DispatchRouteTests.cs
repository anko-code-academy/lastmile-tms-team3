using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class DispatchRouteTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly DispatchRoute.Handler _handler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Driver _driver;
    private readonly Vehicle _vehicle;
    private readonly Address _address;

    public DispatchRouteTests()
    {
        _context = TestAppDbContext.Create<DispatchRouteTests>();
        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.IsInRole("Admin").Returns(true);
        _handler = new DispatchRoute.Handler(_context, _currentUser);

        _address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = _address.Id,
            Address = _address
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

        _context.Addresses.Add(_address);
        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.Drivers.Add(_driver);
        _context.Vehicles.Add(_vehicle);
        _context.SaveChanges();
    }

    [Fact]
    public async Task DispatchRoute_WithValidRoute_ShouldReturnDispatchedRoute()
    {
        // Arrange
        var routeId = await CreateDraftRouteWithParcels(2);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.Id.Should().Be(routeId);
        result.Status.Should().Be(RouteStatus.Dispatched);
    }

    [Fact]
    public async Task DispatchRoute_ShouldTransitionParcelsToOutForDelivery()
    {
        // Arrange
        var routeId = await CreateDraftRouteWithParcels(3);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert — verify parcels in DB are now OutForDelivery
        using var verifyContext = _context.CreateDbContext();
        var parcels = await verifyContext.Parcels
            .Where(p => p.RouteId == routeId)
            .ToListAsync();

        parcels.Should().HaveCount(3);
        parcels.Should().OnlyContain(p => p.Status == ParcelStatus.OutForDelivery);
    }

    [Fact]
    public async Task DispatchRoute_ShouldCreateTrackingEventsForParcels()
    {
        // Arrange
        var routeId = await CreateDraftRouteWithParcels(2);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        using var verifyContext = _context.CreateDbContext() as TestAppDbContext;
        var events = await verifyContext!.Set<TrackingEvent>()
            .Where(te => te.EventType == EventType.OutForDelivery)
            .ToListAsync();

        events.Should().HaveCount(2);
    }

    [Fact]
    public async Task DispatchRoute_ShouldSetDispatchedAtTimestamp()
    {
        // Arrange
        var routeId = await CreateDraftRouteWithParcels(1);
        var before = DateTimeOffset.UtcNow;

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        await _handler.Handle(command, CancellationToken.None);

        // Assert
        using var verifyContext = _context.CreateDbContext();
        var route = await verifyContext.DeliveryRoutes.FindAsync(routeId);
        route.Should().NotBeNull();
        route!.DispatchedAt.Should().NotBeNull();
        route.DispatchedAt.Should().BeOnOrAfter(before);
    }

    [Fact]
    public async Task DispatchRoute_WhenRouteNotFound_ShouldThrow()
    {
        // Arrange
        var dto = new DispatchRouteDto(Guid.NewGuid());
        var command = new DispatchRoute.Command(dto);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    [Fact]
    public async Task DispatchRoute_WhenNoDriverAssigned_ShouldThrow()
    {
        // Arrange — create route without driver
        var routeId = await CreateDraftRoute(driverId: null, vehicleId: _vehicle.Id, parcelCount: 1);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*driver*");
    }

    [Fact]
    public async Task DispatchRoute_WhenNoVehicleAssigned_ShouldThrow()
    {
        // Arrange
        var routeId = await CreateDraftRoute(driverId: _driver.Id, vehicleId: null, parcelCount: 1);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*vehicle*");
    }

    [Fact]
    public async Task DispatchRoute_WhenNoParcels_ShouldThrow()
    {
        // Arrange
        var routeId = await CreateDraftRoute(driverId: _driver.Id, vehicleId: _vehicle.Id, parcelCount: 0);

        var dto = new DispatchRouteDto(routeId);
        var command = new DispatchRoute.Command(dto);

        // Act
        var act = () => _handler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*parcel*");
    }

    private async Task<Guid> CreateDraftRouteWithParcels(int parcelCount)
    {
        return await CreateDraftRoute(_driver.Id, _vehicle.Id, parcelCount);
    }

    private async Task<Guid> CreateDraftRoute(Guid? driverId, Guid? vehicleId, int parcelCount)
    {
        var routeId = Guid.NewGuid();

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Test Route",
            DepotId = _depot.Id,
            Depot = _depot,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            ZoneId = _zone.Id,
            Zone = _zone,
            DriverId = driverId,
            Driver = driverId.HasValue ? _driver : null,
            VehicleId = vehicleId,
            Vehicle = vehicleId.HasValue ? _vehicle : null,
            Status = RouteStatus.Draft
        };

        _context.DeliveryRoutes.Add(route);

        for (int i = 0; i < parcelCount; i++)
        {
            var parcelAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = $"{100 + i} Parcel St",
                City = "TestCity",
                State = "TS",
                PostalCode = "12345",
                CountryCode = "US"
            };
            _context.Addresses.Add(parcelAddress);

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"TRK-{Guid.NewGuid():N}"[..15],
                ServiceType = ServiceType.Standard,
                Status = ParcelStatus.Loaded,
                ShipperAddressId = _address.Id,
                ShipperAddress = _address,
                RecipientAddressId = parcelAddress.Id,
                RecipientAddress = parcelAddress,
                Weight = 5.0m,
                WeightUnit = WeightUnit.Kg,
                Length = 30.0m,
                Width = 20.0m,
                Height = 15.0m,
                DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = 100.0m,
                Currency = "USD",
                RouteId = routeId,
                ZoneId = _zone.Id
            };
            _context.Parcels.Add(parcel);

            route.RouteParcels.Add(new RouteParcel
            {
                RouteId = routeId,
                ParcelId = parcel.Id,
                Parcel = parcel,
                StopOrder = i + 1,
                AddedAt = DateTimeOffset.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return routeId;
    }

    public void Dispose() => _context.Dispose();
}
