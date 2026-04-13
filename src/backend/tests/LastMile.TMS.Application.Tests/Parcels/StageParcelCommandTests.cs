using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Parcels;

public class StageParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly StageParcel.Handler _handler;
    private readonly ICurrentUserService _currentUser;

    private const string TrackingNumber = "STAGE-TEST-001";
    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();
    private readonly Guid _routeId = Guid.NewGuid();
    private readonly Guid _otherRouteId = Guid.NewGuid();

    public StageParcelCommandTests()
    {
        _context = TestAppDbContext.Create<StageParcelCommandTests>();

        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.IsInRole("Admin").Returns(true);

        _handler = new StageParcel.Handler(_context, _currentUser);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Zone North",
            IsActive = true,
            DepotId = _depotId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var route = new DeliveryRoute
        {
            Id = _routeId,
            Name = "Route-01",
            DepotId = _depotId,
            ZoneId = _zoneId,
            Date = DateOnly.FromDateTime(DateTime.Today),
            Status = RouteStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var otherRoute = new DeliveryRoute
        {
            Id = _otherRouteId,
            Name = "Route-02",
            DepotId = _depotId,
            ZoneId = _zoneId,
            Date = DateOnly.FromDateTime(DateTime.Today),
            Status = RouteStatus.Draft,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Main St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = true,
            ContactName = "Alice"
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Sender Ave",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            IsResidential = false,
            ContactName = "Bob"
        };

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = TrackingNumber,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Sorted,
            RecipientAddressId = recipientAddress.Id,
            ShipperAddressId = shipperAddress.Id,
            ZoneId = _zoneId,
            Weight = 2.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 20,
            Width = 15,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Depots.Add(depot);
        _context.Zones.Add(zone);
        _context.DeliveryRoutes.AddRange(route, otherRoute);
        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();
    }

    [Fact]
    public async Task StageParcel_ValidSortedParcel_TransitionsToStaged()
    {
        var dto = new StageParcelDto(TrackingNumber, _routeId, "Op1", "Nashville", "TN", "US");

        var result = await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Staged);
        result.RouteId.Should().Be(_routeId);
        result.RouteName.Should().Be("Route-01");
        result.IsMisstage.Should().BeFalse();
        result.AssignedRouteName.Should().BeNull();
        result.TrackingNumber.Should().Be(TrackingNumber);
    }

    [Fact]
    public async Task StageParcel_ValidSortedParcel_SetsRouteIdOnParcel()
    {
        var dto = new StageParcelDto(TrackingNumber, _routeId, "Op1", null, null, null);

        await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        using var context = _context.CreateDbContext();
        var parcel = await context.Parcels.FindAsync(
            context.Parcels.First(p => p.TrackingNumber == TrackingNumber).Id);
        parcel!.RouteId.Should().Be(_routeId);
    }

    [Fact]
    public async Task StageParcel_AlreadyAssignedToDifferentRoute_ReturnsMisstageFlag()
    {
        const string misstageTracking = "STAGE-MISSTAGE-001";
        var recipientAddr = new Address
        {
            Id = Guid.NewGuid(), Street1 = "2 St", City = "Nashville", State = "TN",
            PostalCode = "37201", CountryCode = "US", IsResidential = true, ContactName = "X"
        };
        var shipperAddr = new Address
        {
            Id = Guid.NewGuid(), Street1 = "3 St", City = "Memphis", State = "TN",
            PostalCode = "38103", CountryCode = "US", IsResidential = false, ContactName = "Y"
        };
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(), TrackingNumber = misstageTracking,
            ServiceType = ServiceType.Standard, Status = ParcelStatus.Sorted,
            RecipientAddressId = recipientAddr.Id, ShipperAddressId = shipperAddr.Id,
            ZoneId = _zoneId, RouteId = _routeId,
            Weight = 1m, WeightUnit = WeightUnit.Kg,
            Length = 10, Width = 10, Height = 10, DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 10, Currency = "USD", DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Addresses.AddRange(recipientAddr, shipperAddr);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new StageParcelDto(misstageTracking, _otherRouteId, "Op1", null, null, null);

        var result = await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        result.IsMisstage.Should().BeTrue();
        result.Status.Should().Be(ParcelStatus.Sorted);
        result.AssignedRouteName.Should().Be("Route-01");
        result.RouteName.Should().Be("Route-02");
    }

    [Fact]
    public async Task StageParcel_ParcelNotFound_ThrowsParcelNotFoundException()
    {
        var dto = new StageParcelDto("NONEXISTENT-999", _routeId, "Op1", null, null, null);

        var act = async () => await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<ParcelNotFoundException>()
            .WithMessage("*NONEXISTENT-999*");
    }

    [Fact]
    public async Task StageParcel_RouteNotFound_ThrowsRouteNotFoundException()
    {
        var dto = new StageParcelDto(TrackingNumber, Guid.NewGuid(), "Op1", null, null, null);

        var act = async () => await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<RouteNotFoundException>();
    }

    [Fact]
    public async Task StageParcel_WrongStatus_ThrowsInvalidStatusTransitionException()
    {
        const string registeredTracking = "STAGE-BADSTATUS-001";
        var recipientAddr = new Address
        {
            Id = Guid.NewGuid(), Street1 = "5 St", City = "Nashville", State = "TN",
            PostalCode = "37201", CountryCode = "US", IsResidential = true, ContactName = "X"
        };
        var shipperAddr = new Address
        {
            Id = Guid.NewGuid(), Street1 = "6 St", City = "Memphis", State = "TN",
            PostalCode = "38103", CountryCode = "US", IsResidential = false, ContactName = "Y"
        };
        _context.Addresses.AddRange(recipientAddr, shipperAddr);
        _context.Parcels.Add(new Parcel
        {
            Id = Guid.NewGuid(), TrackingNumber = registeredTracking,
            ServiceType = ServiceType.Standard, Status = ParcelStatus.ReceivedAtDepot,
            RecipientAddressId = recipientAddr.Id, ShipperAddressId = shipperAddr.Id,
            Weight = 1m, WeightUnit = WeightUnit.Kg,
            Length = 10, Width = 10, Height = 10, DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 10, Currency = "USD", DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new StageParcelDto(registeredTracking, _routeId, "Op1", null, null, null);

        var act = async () => await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task StageParcel_ValidStage_CreatesTrackingEvent()
    {
        var dto = new StageParcelDto(TrackingNumber, _routeId, "Stager1", "Nashville", "TN", "US");

        await _handler.Handle(new StageParcel.Command(dto), CancellationToken.None);

        using var context = _context.CreateDbContext();
        var parcel = context.Parcels
            .Include(p => p.TrackingEvents)
            .First(p => p.TrackingNumber == TrackingNumber);
        parcel.TrackingEvents.Should().HaveCount(1);
        parcel.TrackingEvents.First().Operator.Should().Be("Stager1");
        parcel.TrackingEvents.First().LocationCity.Should().Be("Nashville");
    }

    public void Dispose() => _context.Dispose();
}
