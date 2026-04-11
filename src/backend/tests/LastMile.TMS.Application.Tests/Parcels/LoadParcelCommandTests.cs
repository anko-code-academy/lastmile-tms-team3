using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using NSubstitute;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LastMile.TMS.Application.Tests.Parcels;

public class LoadParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly LoadParcel.Handler _handler;
    private readonly IAppDbContextFactory _contextFactory;
    private readonly ICurrentUserService _currentUser;

    public LoadParcelCommandTests()
    {
        _context = TestAppDbContext.Create();
        _contextFactory = _context;
        _currentUser = Substitute.For<ICurrentUserService>();
        _currentUser.IsInRole("Admin").Returns(true);
        _handler = new LoadParcel.Handler(_contextFactory, _currentUser);
    }

    [Fact]
    public async Task LoadParcel_WithValidInput_ShouldLoadParcelAndCreateTrackingEvent()
    {
        // Arrange
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();

        var address = new Address
        {
            Id = addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Route 1",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "TRACK123",
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
            RouteId = route.Id
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new LoadParcelDto(
            "TRACK123",
            routeId,
            "Operator",
            "City",
            "State",
            "US"
        );
        var command = new LoadParcel.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.ParcelId.Should().Be(parcelId);
        result.TrackingNumber.Should().Be("TRACK123");
        result.Status.Should().Be(ParcelStatus.Loaded);
        result.IsWrongRoute.Should().BeFalse();

        // Query from fresh context to see saved changes
        using var verificationContext = _contextFactory.CreateDbContext();
        var updatedParcel = await verificationContext.Parcels
            .AsQueryable()
            .Include(p => p.TrackingEvents)
            .FirstOrDefaultAsync(p => p.Id == parcelId);

        updatedParcel.Should().NotBeNull();
        updatedParcel!.Status.Should().Be(ParcelStatus.Loaded);
        updatedParcel.RouteId.Should().Be(routeId);
        updatedParcel.TrackingEvents.Should().ContainSingle(e =>
            e.EventType == EventType.Loaded);
    }

    [Fact]
    public async Task LoadParcel_WhenParcelNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var dto = new LoadParcelDto(
            "NONEXISTENT",
            Guid.NewGuid(),
            "Operator",
            "City",
            "State",
            "US"
        );
        var command = new LoadParcel.Command(dto);

        // Act & Assert
        var act = async () => await _handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task LoadParcel_WhenRouteNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();

        var address = new Address
        {
            Id = addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Route 1",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "TRACK123",
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
            RouteId = route.Id
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new LoadParcelDto(
            "TRACK123",
            Guid.NewGuid(),
            "Operator",
            "City",
            "State",
            "US"
        );
        var command = new LoadParcel.Command(dto);

        // Act & Assert
        var act = async () => await _handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task LoadParcel_WhenParcelAlreadyAssignedToDifferentRoute_ShouldReturnIsWrongRouteTrue()
    {
        // Arrange
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var otherRouteId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();

        var address = new Address
        {
            Id = addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Route 1",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var otherRoute = new DeliveryRoute
        {
            Id = otherRouteId,
            Name = "Route 2",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "TRACK123",
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
            RouteId = otherRouteId
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.DeliveryRoutes.Add(otherRoute);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new LoadParcelDto(
            "TRACK123",
            routeId,
            "Operator",
            "City",
            "State",
            "US"
        );
        var command = new LoadParcel.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsWrongRoute.Should().BeTrue();
        result.AssignedRouteName.Should().Be("Route 2");
        result.AssignedRouteId.Should().Be(otherRouteId);
    }

    [Fact]
    public async Task LoadParcel_WhenParcelNotStaged_ShouldThrowInvalidStatusTransitionException()
    {
        // Arrange
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();

        var address = new Address
        {
            Id = addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Route 1",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "TRACK456",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Sorted,
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

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new LoadParcelDto(
            "TRACK456",
            routeId,
            "Operator",
            "City",
            "State",
            "US"
        );
        var command = new LoadParcel.Command(dto);

        // Act & Assert
        var act = async () => await _handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task LoadParcel_WithForceLoad_ShouldLoadParcelOntoDifferentRoute()
    {
        // Arrange
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();
        var otherRouteId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();

        var address = new Address
        {
            Id = addressId,
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var route = new DeliveryRoute
        {
            Id = routeId,
            Name = "Route 1",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var otherRoute = new DeliveryRoute
        {
            Id = otherRouteId,
            Name = "Route 2",
            DepotId = depot.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "TRACK789",
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
            RouteId = otherRouteId
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.DeliveryRoutes.Add(otherRoute);
        _context.Parcels.Add(parcel);
        await _context.SaveChangesAsync();

        var dto = new LoadParcelDto(
            "TRACK789",
            routeId,
            "Operator",
            "City",
            "State",
            "US",
            ForceLoad: true
        );
        var command = new LoadParcel.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.IsWrongRoute.Should().BeFalse();
        result.Status.Should().Be(ParcelStatus.Loaded);

        using var verificationContext = _contextFactory.CreateDbContext();
        var updatedParcel = await verificationContext.Parcels
            .FirstOrDefaultAsync(p => p.Id == parcelId);

        updatedParcel.Should().NotBeNull();
        updatedParcel!.RouteId.Should().Be(routeId);
        updatedParcel.Status.Should().Be(ParcelStatus.Loaded);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
