using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.DeliveryRoutes.Commands;
using LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LastMile.TMS.Application.Tests.DeliveryRoutes;

public class CompleteLoadingCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly CompleteLoading.Handler _handler;

    public CompleteLoadingCommandTests()
    {
        _context = TestAppDbContext.Create();
        _handler = new CompleteLoading.Handler(_context);
    }

    [Fact]
    public async Task CompleteLoading_WhenAllParcelsLoaded_ShouldReturnSuccess()
    {
        // Arrange
        var (addressId, depotId, routeId, parcelIds) = await SetupTestDataAsync(allLoaded: true);

        var dto = new CompleteLoadingDto(routeId, "Operator");
        var command = new CompleteLoading.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.RouteId.Should().Be(routeId);
        result.IsSuccess.Should().BeTrue();
        result.HasUnloadedParcels.Should().BeFalse();
        result.UnloadedParcelCount.Should().Be(0);
        result.UnloadedParcels.Should().BeEmpty();

        // Verify route status is updated
        using var verificationContext = _context.CreateDbContext();
        var route = await verificationContext.DeliveryRoutes.AsQueryable()
            .Include(r => r.Parcels)
            .FirstOrDefaultAsync(r => r.Id == routeId);
        route.Should().NotBeNull();
        route!.Status.Should().Be(RouteStatus.Active);
    }

    [Fact]
    public async Task CompleteLoading_WhenSomeParcelsNotLoaded_ShouldReturnUnloadedParcelsWithoutCompleting()
    {
        // Arrange
        var (addressId, depotId, routeId, parcelIds) = await SetupTestDataAsync(allLoaded: false);

        var dto = new CompleteLoadingDto(routeId, "Operator");
        var command = new CompleteLoading.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.RouteId.Should().Be(routeId);
        result.IsSuccess.Should().BeFalse();
        result.HasUnloadedParcels.Should().BeTrue();
        result.UnloadedParcelCount.Should().BeGreaterThan(0);
        result.UnloadedParcels.Should().NotBeEmpty();
        result.UnloadedParcels.Should().ContainSingle(p => p.TrackingNumber == "TRACK003");

        // Verify route status is still Draft (not completed)
        using var verificationContext = _context.CreateDbContext();
        var route = await verificationContext.DeliveryRoutes.AsQueryable()
            .Include(r => r.Parcels)
            .FirstOrDefaultAsync(r => r.Id == routeId);
        route.Should().NotBeNull();
        route!.Status.Should().Be(RouteStatus.Draft);
    }

    [Fact]
    public async Task CompleteLoading_WithForceComplete_ShouldCompleteEvenWithUnloadedParcels()
    {
        // Arrange
        var (addressId, depotId, routeId, parcelIds) = await SetupTestDataAsync(allLoaded: false);

        var dto = new CompleteLoadingDto(routeId, "Operator", ForceComplete: true);
        var command = new CompleteLoading.Command(dto);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        result.RouteId.Should().Be(routeId);
        result.IsSuccess.Should().BeTrue();
        result.HasUnloadedParcels.Should().BeTrue();
        result.UnloadedParcels.Should().ContainSingle(p => p.TrackingNumber == "TRACK003");

        // Verify route status is now Active
        using var verificationContext = _context.CreateDbContext();
        var route = await verificationContext.DeliveryRoutes.AsQueryable()
            .Include(r => r.Parcels)
            .FirstOrDefaultAsync(r => r.Id == routeId);
        route.Should().NotBeNull();
        route!.Status.Should().Be(RouteStatus.Active);
    }

    [Fact]
    public async Task CompleteLoading_WhenRouteNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var dto = new CompleteLoadingDto(Guid.NewGuid(), "Operator");
        var command = new CompleteLoading.Command(dto);

        // Act & Assert
        var act = async () => await _handler.Handle(command, CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    private async Task<(Guid addressId, Guid depotId, Guid routeId, List<Guid> parcelIds)> SetupTestDataAsync(bool allLoaded = true)
    {
        var addressId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var routeId = Guid.NewGuid();

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

        var parcelIds = new List<Guid>();
        var parcels = new List<Parcel>();

        for (int i = 1; i <= 3; i++)
        {
            var parcelId = Guid.NewGuid();
            parcelIds.Add(parcelId);

            var status = (allLoaded || i < 3) ? ParcelStatus.Loaded : ParcelStatus.Staged;

            parcels.Add(new Parcel
            {
                Id = parcelId,
                TrackingNumber = $"TRACK{i:D3}",
                ServiceType = ServiceType.Standard,
                Status = status,
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
            });
        }

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.DeliveryRoutes.Add(route);
        _context.Parcels.AddRange(parcels);
        await _context.SaveChangesAsync();

        return (addressId, depotId, routeId, parcelIds);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
