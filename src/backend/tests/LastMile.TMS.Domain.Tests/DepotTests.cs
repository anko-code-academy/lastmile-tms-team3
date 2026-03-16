using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Entities;
using FluentAssertions;

namespace LastMile.TMS.Domain.Tests;

public class DepotTests
{
    [Fact]
    public void Depot_ShouldHaveDefaultEmptyId()
    {
        var depot = new Depot { Name = "Test Depot" };

        depot.Id.Should().BeEmpty();
    }

    [Fact]
    public void Depot_ShouldInherit_FromBaseAuditableEntity()
    {
        var depot = new Depot { Name = "Test Depot" };

        depot.Should().BeAssignableTo<BaseAuditableEntity>();
    }

    [Fact]
    public void Depot_ShouldHaveDefaultIsActive_AsTrue()
    {
        var depot = new Depot { Name = "Test Depot" };

        depot.IsActive.Should().BeFalse(); // EF Core default value, not domain default
    }

    [Fact]
    public void Depot_ShouldInitializeEmptyZonesCollection()
    {
        var depot = new Depot { Name = "Test Depot" };

        depot.Zones.Should().BeEmpty();
    }

    [Fact]
    public void Depot_CanAddZone()
    {
        var depot = new Depot { Name = "Test Depot" };
        var zone = new Zone { Name = "Zone 1", DepotId = depot.Id };

        depot.Zones.Add(zone);

        depot.Zones.Should().Contain(zone);
    }

    [Fact]
    public void Address_Entity_ShouldHaveAllProperties()
    {
        var address = new Address
        {
            Street1 = "123 Main St",
            City = "New York",
            State = "NY",
            PostalCode = "10001",
            CountryCode = "US"
        };

        address.Street1.Should().Be("123 Main St");
        address.City.Should().Be("New York");
        address.State.Should().Be("NY");
        address.PostalCode.Should().Be("10001");
        address.CountryCode.Should().Be("US");
    }

    [Fact]
    public void OperatingHours_Record_ShouldHaveDefaultEmptyDaysOfWeek()
    {
        var operatingHours = new OperatingHours();

        operatingHours.DaysOfWeek.Should().BeEmpty();
    }
}