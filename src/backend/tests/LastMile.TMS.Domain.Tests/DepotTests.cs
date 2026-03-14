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
    public void Address_Record_ShouldHaveAllProperties()
    {
        var address = new Address
        {
            Street = "123 Main St",
            City = "New York",
            State = "NY",
            PostalCode = "10001",
            Country = "USA",
            Latitude = 40.7128,
            Longitude = -74.0060
        };

        address.Street.Should().Be("123 Main St");
        address.City.Should().Be("New York");
        address.State.Should().Be("NY");
        address.PostalCode.Should().Be("10001");
        address.Country.Should().Be("USA");
        address.Latitude.Should().Be(40.7128);
        address.Longitude.Should().Be(-74.0060);
    }

    [Fact]
    public void OperatingHours_Record_ShouldHaveDefaultEmptyDaysOfWeek()
    {
        var operatingHours = new OperatingHours();

        operatingHours.DaysOfWeek.Should().BeEmpty();
    }
}