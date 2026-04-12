using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class DeliveryRouteOptimizationTests
{
    private readonly Zone _zone;

    public DeliveryRouteOptimizationTests()
    {
        var depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = depot.Id,
            Depot = depot
        };
    }

    private DeliveryRoute CreateDraftRoute()
    {
        return new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = _zone.DepotId,
            Depot = _zone.Depot!,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            ZoneId = _zone.Id,
            Zone = _zone,
            Status = RouteStatus.Draft
        };
    }

    private Parcel CreateParcel()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Test St",
            City = "City",
            State = "State",
            PostalCode = "12345",
            CountryCode = "US"
        };

        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = $"LMT-{Guid.NewGuid():N}"[..15],
            Status = ParcelStatus.Staged,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            ZoneId = _zone.Id
        };
    }

    [Fact]
    public void ApplyOptimizedStopOrder_WhenDraft_ReordersAndSetsDistanceAndDuration()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        var p2 = CreateParcel();
        var p3 = CreateParcel();
        route.AddParcel(p1); // StopOrder = 1
        route.AddParcel(p2); // StopOrder = 2
        route.AddParcel(p3); // StopOrder = 3

        // Optimize: reverse order (3, 2, 1)
        var optimizedOrder = new Dictionary<Guid, int>
        {
            [p1.Id] = 3,
            [p2.Id] = 2,
            [p3.Id] = 1,
        };

        // Act
        route.ApplyOptimizedStopOrder(optimizedOrder, 15.5m, 1800);

        // Assert
        route.RouteParcels.First(rp => rp.ParcelId == p1.Id).StopOrder.Should().Be(3);
        route.RouteParcels.First(rp => rp.ParcelId == p2.Id).StopOrder.Should().Be(2);
        route.RouteParcels.First(rp => rp.ParcelId == p3.Id).StopOrder.Should().Be(1);
        route.EstimatedDistance.Should().Be(15.5m);
        route.EstimatedDuration.Should().Be(1800);
    }

    [Fact]
    public void ApplyOptimizedStopOrder_WhenNotDraft_Throws()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        route.AddParcel(p1);
        route.Status = RouteStatus.Dispatched;

        var optimizedOrder = new Dictionary<Guid, int> { [p1.Id] = 1 };

        // Act
        var act = () => route.ApplyOptimizedStopOrder(optimizedOrder, 10m);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public void ApplyOptimizedStopOrder_WhenMissingParcel_Throws()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        route.AddParcel(p1);

        // Order includes a parcel not on the route
        var optimizedOrder = new Dictionary<Guid, int>
        {
            [p1.Id] = 1,
            [Guid.NewGuid()] = 2, // phantom parcel
        };

        // Act
        var act = () => route.ApplyOptimizedStopOrder(optimizedOrder, 10m);

        // Assert
        act.Should().Throw<RouteOptimizationException>()
            .WithMessage("*must include all*");
    }

    [Fact]
    public void ApplyOptimizedStopOrder_WhenTooFewParcels_Throws()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        var p2 = CreateParcel();
        route.AddParcel(p1);
        route.AddParcel(p2);

        // Order is missing p2
        var optimizedOrder = new Dictionary<Guid, int> { [p1.Id] = 1 };

        // Act
        var act = () => route.ApplyOptimizedStopOrder(optimizedOrder, 10m);

        // Assert
        act.Should().Throw<RouteOptimizationException>()
            .WithMessage("*must include all*");
    }

    [Fact]
    public void ReorderStopsExplicit_WhenDraft_Reorders()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        var p2 = CreateParcel();
        var p3 = CreateParcel();
        route.AddParcel(p1);
        route.AddParcel(p2);
        route.AddParcel(p3);

        var newOrder = new Dictionary<Guid, int>
        {
            [p1.Id] = 2,
            [p2.Id] = 3,
            [p3.Id] = 1,
        };

        // Act
        route.ReorderStopsExplicit(newOrder);

        // Assert
        route.RouteParcels.First(rp => rp.ParcelId == p1.Id).StopOrder.Should().Be(2);
        route.RouteParcels.First(rp => rp.ParcelId == p2.Id).StopOrder.Should().Be(3);
        route.RouteParcels.First(rp => rp.ParcelId == p3.Id).StopOrder.Should().Be(1);
    }

    [Fact]
    public void ReorderStopsExplicit_WhenNotDraft_Throws()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        route.AddParcel(p1);
        route.Status = RouteStatus.Dispatched;

        var newOrder = new Dictionary<Guid, int> { [p1.Id] = 1 };

        // Act
        var act = () => route.ReorderStopsExplicit(newOrder);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public void ReorderStopsExplicit_WhenParcelNotFound_Throws()
    {
        // Arrange
        var route = CreateDraftRoute();
        var p1 = CreateParcel();
        route.AddParcel(p1);

        var newOrder = new Dictionary<Guid, int>
        {
            [p1.Id] = 1,
            [Guid.NewGuid()] = 2, // phantom parcel
        };

        // Act
        var act = () => route.ReorderStopsExplicit(newOrder);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*not on this route*");
    }

    [Fact]
    public void ApplyOptimizedStopOrder_WhenNoParcels_DoesNothing()
    {
        // Arrange
        var route = CreateDraftRoute();

        // Act
        route.ApplyOptimizedStopOrder([], 0m);

        // Assert
        route.RouteParcels.Should().BeEmpty();
        route.EstimatedDistance.Should().Be(0m);
    }
}
