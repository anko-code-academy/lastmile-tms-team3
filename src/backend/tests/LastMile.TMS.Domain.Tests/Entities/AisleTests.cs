using FluentAssertions;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Domain.Tests.Entities;

public class AisleTests
{
    [Fact]
    public void Aisle_Should_Initialize_Bins_Collection()
    {
        var aisle = new Aisle();

        aisle.Bins.Should().NotBeNull();
        aisle.Bins.Should().BeEmpty();
    }

    [Fact]
    public void Aisle_Can_Be_Linked_To_A_Zone()
    {
        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone"
        };

        var aisle = new Aisle
        {
            Id = Guid.NewGuid(),
            Name = "Aisle A",
            Code = "A",
            ZoneId = zone.Id,
            Zone = zone,
            SortOrder = 1,
            IsActive = true
        };

        aisle.ZoneId.Should().Be(zone.Id);
        aisle.Zone.Should().BeSameAs(zone);
    }
}