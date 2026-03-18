using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using FluentAssertions;

namespace LastMile.TMS.Domain.Tests.Entities;

public class VehicleTests
{
    [Fact]
    public void Vehicle_ShouldHaveDefaultEmptyId()
    {
        var vehicle = new Vehicle { RegistrationPlate = "ABC123" };

        vehicle.Id.Should().BeEmpty();
    }

    [Fact]
    public void Vehicle_ShouldInherit_FromBaseAuditableEntity()
    {
        var vehicle = new Vehicle { RegistrationPlate = "ABC123" };

        vehicle.Should().BeAssignableTo<BaseAuditableEntity>();
    }

    [Fact]
    public void Vehicle_ShouldHaveDefaultValues()
    {
        var vehicle = new Vehicle { RegistrationPlate = "ABC123" };

        vehicle.RegistrationPlate.Should().Be("ABC123");
        vehicle.Type.Should().Be(default(VehicleType));
        vehicle.Status.Should().Be(default(VehicleStatus));
        vehicle.ParcelCapacity.Should().Be(0);
        vehicle.WeightCapacity.Should().Be(0);
        vehicle.WeightUnit.Should().Be(default(WeightUnit));
        vehicle.DepotId.Should().BeEmpty();
        vehicle.Depot.Should().BeNull();
    }

    [Fact]
    public void Vehicle_CanSetProperties()
    {
        var vehicle = new Vehicle
        {
            RegistrationPlate = "XYZ789",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 100,
            WeightCapacity = 2000,
            WeightUnit = WeightUnit.Kg,
            DepotId = Guid.NewGuid()
        };

        vehicle.RegistrationPlate.Should().Be("XYZ789");
        vehicle.Type.Should().Be(VehicleType.Van);
        vehicle.Status.Should().Be(VehicleStatus.Available);
        vehicle.ParcelCapacity.Should().Be(100);
        vehicle.WeightCapacity.Should().Be(2000);
        vehicle.WeightUnit.Should().Be(WeightUnit.Kg);
        vehicle.DepotId.Should().NotBeEmpty();
    }

    [Fact]
    public void Depot_ShouldHaveVehiclesCollection()
    {
        var depot = new Depot { Name = "Test Depot" };
        var vehicle = new Vehicle { RegistrationPlate = "V1", DepotId = depot.Id };

        depot.Vehicles.Add(vehicle);

        depot.Vehicles.Should().Contain(vehicle);
        vehicle.Depot.Should().BeNull(); // Not set unless assigned
    }

    [Fact]
    public void Depot_CanAssignVehicle()
    {
        var depot = new Depot { Name = "Test Depot" };
        var vehicle = new Vehicle { RegistrationPlate = "V1", Depot = depot };

        vehicle.Depot.Should().Be(depot);
        vehicle.DepotId.Should().Be(depot.Id);
        depot.Vehicles.Should().BeEmpty(); // Not automatically added
    }
}