using LastMile.TMS.Domain.Entities;
using FluentAssertions;
using NetTopologySuite.Geometries;
using NetTopologySuite;

namespace LastMile.TMS.Domain.Tests;

public class ZoneTests
{
    private static readonly GeometryFactory GeometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    [Fact]
    public void Zone_ShouldHaveDefaultEmptyId()
    {
        var zone = new Zone { Name = "Test Zone" };

        zone.Id.Should().BeEmpty();
    }

    [Fact]
    public void Zone_ShouldInherit_FromBaseAuditableEntity()
    {
        var zone = new Zone { Name = "Test Zone" };

        zone.Should().BeAssignableTo<Common.BaseAuditableEntity>();
    }

    [Fact]
    public void Zone_CanHaveBoundary()
    {
        var zone = new Zone { Name = "Test Zone" };
        var polygon = GeometryFactory.CreatePolygon(
            new Coordinate[] {
                new(0, 0),
                new(0, 1),
                new(1, 1),
                new(1, 0),
                new(0, 0)
            });

        zone.Boundary = polygon;

        zone.Boundary.Should().BeSameAs(polygon);
    }

    [Fact]
    public void Zone_Boundary_CanBeNull()
    {
        var zone = new Zone { Name = "Test Zone" };

        zone.Boundary.Should().BeNull();
    }

    [Fact]
    public void Zone_CanBeLinkedToDepot()
    {
        var depot = new Depot { Name = "Test Depot" };
        var zone = new Zone { Name = "Test Zone", DepotId = depot.Id, Depot = depot };

        zone.DepotId.Should().Be(depot.Id);
        zone.Depot.Should().BeSameAs(depot);
    }

    [Fact]
    public void Zone_HasDefaultIsActive_AsFalse()
    {
        var zone = new Zone { Name = "Test Zone" };

        zone.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Zone_CanBeActivated()
    {
        var zone = new Zone { Name = "Test Zone", IsActive = false };

        zone.IsActive = true;

        zone.IsActive.Should().BeTrue();
    }
}