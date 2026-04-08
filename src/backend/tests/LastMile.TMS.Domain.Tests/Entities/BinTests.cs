using FluentAssertions;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Domain.Tests.Entities;

public class BinTests
{
    [Fact]
    public void Bin_Should_Expose_Current_Parcels_Collection()
    {
        var bin = new Bin();

        bin.Parcels.Should().NotBeNull();
        bin.Parcels.Should().BeEmpty();
    }

    [Fact]
    public void Bin_Can_Be_Linked_To_An_Aisle()
    {
        var aisle = new Aisle
        {
            Id = Guid.NewGuid(),
            Name = "Aisle A",
            Code = "A"
        };

        var bin = new Bin
        {
            Id = Guid.NewGuid(),
            Name = "Bin A-01",
            Code = "A-01",
            AisleId = aisle.Id,
            Aisle = aisle,
            CapacityParcelCount = 20,
            IsActive = true
        };

        bin.AisleId.Should().Be(aisle.Id);
        bin.Aisle.Should().BeSameAs(aisle);
        bin.CapacityParcelCount.Should().Be(20);
    }
}