using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class DeliveryRouteTests
{
    private readonly Zone _zone;
    private readonly Driver _driver;
    private readonly Vehicle _vehicle;

    public DeliveryRouteTests()
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

        _driver = Driver.Create(
            "John", "Doe", "555-0100", "john@test.com",
            "DL12345", new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: depot.Id);

        _vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "ABC-1234",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 500,
            WeightUnit = WeightUnit.Kg,
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
            DriverId = _driver.Id,
            Driver = _driver,
            VehicleId = _vehicle.Id,
            Vehicle = _vehicle,
            Status = RouteStatus.Draft
        };
    }

    private Parcel CreateParcel(ParcelStatus status = ParcelStatus.Staged, Guid? zoneId = null)
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
            Status = status,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            ZoneId = zoneId ?? _zone.Id
        };
    }

    private Parcel CreateParcelWithAddress(Address address, ParcelStatus status = ParcelStatus.Staged)
    {
        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = $"LMT-{Guid.NewGuid():N}"[..15],
            Status = status,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            ZoneId = _zone.Id
        };
    }

    [Fact]
    public void DeliveryRoute_Should_Have_Required_Properties()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        // Assert
        route.Id.Should().NotBeEmpty();
        route.Name.Should().Be("Test Route");
        route.DepotId.Should().NotBeEmpty();
        route.Date.Should().NotBe(DateOnly.MinValue);
        route.Status.Should().Be(RouteStatus.Draft);
    }

    [Fact]
    public void AddParcel_WhenRouteIsDraft_ShouldAddParcelAndIncrementStopCount()
    {
        // Arrange
        var route = CreateDraftRoute();
        var parcel = CreateParcel();

        // Act
        route.AddParcel(parcel);

        // Assert
        route.RouteParcels.Should().ContainSingle(rp => rp.ParcelId == parcel.Id);
        route.EstimatedStops.Should().Be(1);
    }

    [Fact]
    public void AddParcel_WhenParcelAlreadyOnRoute_ShouldThrow()
    {
        // Arrange
        var route = CreateDraftRoute();
        var parcel = CreateParcel();
        route.AddParcel(parcel);

        // Act
        var act = () => route.AddParcel(parcel);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*already assigned*");
    }

    [Fact]
    public void AddParcel_WhenRouteNotDraft_ShouldThrow()
    {
        // Arrange
        var route = CreateDraftRoute();
        route.Status = RouteStatus.Dispatched;
        var parcel = CreateParcel();

        // Act
        var act = () => route.AddParcel(parcel);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public void RemoveParcel_WhenRouteIsDraft_ShouldRemoveParcel()
    {
        // Arrange
        var route = CreateDraftRoute();
        var parcel = CreateParcel();
        route.AddParcel(parcel);

        // Act
        route.RemoveParcel(parcel.Id);

        // Assert
        route.RouteParcels.Should().BeEmpty();
        route.EstimatedStops.Should().Be(0);
    }

    [Fact]
    public void RemoveParcel_WhenParcelNotOnRoute_ShouldThrow()
    {
        // Arrange
        var route = CreateDraftRoute();

        // Act
        var act = () => route.RemoveParcel(Guid.NewGuid());

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    [Fact]
    public void AssignDriver_WhenRouteIsDraft_ShouldSetDriver()
    {
        // Arrange
        var route = CreateDraftRoute();
        var newDriver = Driver.Create(
            "Jane", "Smith", "555-0200", "jane@test.com",
            "DL67890", new DateOnly(2028, 12, 31));

        // Act
        route.AssignDriver(newDriver);

        // Assert
        route.DriverId.Should().Be(newDriver.Id);
        route.Driver.Should().Be(newDriver);
    }

    [Fact]
    public void AssignDriver_WhenRouteNotDraft_ShouldThrow()
    {
        // Arrange
        var route = CreateDraftRoute();
        route.Status = RouteStatus.InProgress;
        var newDriver = Driver.Create(
            "Jane", "Smith", "555-0200", "jane@test.com",
            "DL67890", new DateOnly(2028, 12, 31));

        // Act
        var act = () => route.AssignDriver(newDriver);

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public void AssignVehicle_WhenRouteIsDraft_ShouldSetVehicle()
    {
        // Arrange
        var route = CreateDraftRoute();
        var depot = new Depot { Id = _zone.DepotId, Name = "Depot" };
        var newVehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "XYZ-9999",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 100,
            WeightCapacity = 1000,
            WeightUnit = WeightUnit.Kg,
            DepotId = _zone.DepotId,
            Depot = depot
        };

        // Act
        route.AssignVehicle(newVehicle);

        // Assert
        route.VehicleId.Should().Be(newVehicle.Id);
        route.Vehicle.Should().Be(newVehicle);
    }

    [Fact]
    public void ParcelCount_ShouldReturnCorrectCount()
    {
        // Arrange
        var route = CreateDraftRoute();
        route.AddParcel(CreateParcel());
        route.AddParcel(CreateParcel());
        route.AddParcel(CreateParcel());

        // Assert
        route.ParcelCount.Should().Be(3);
    }

    [Fact]
    public void EstimatedStops_ShouldCountUniqueRecipientAddresses()
    {
        // Arrange — 3 parcels, 2 sharing the same address, 1 with a unique address
        var sharedAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Shared St",
            City = "City",
            State = "State",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var route = CreateDraftRoute();
        route.AddParcel(CreateParcelWithAddress(sharedAddress));
        route.AddParcel(CreateParcelWithAddress(sharedAddress));
        route.AddParcel(CreateParcel()); // unique address

        // Assert — 2 unique addresses = 2 stops
        route.ParcelCount.Should().Be(3);
        route.EstimatedStops.Should().Be(2);
    }

    [Fact]
    public void EstimatedStops_WhenAllParcelsShareSameAddress_ShouldBe1()
    {
        // Arrange
        var sharedAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "200 Same St",
            City = "City",
            State = "State",
            PostalCode = "54321",
            CountryCode = "US"
        };

        var route = CreateDraftRoute();
        route.AddParcel(CreateParcelWithAddress(sharedAddress));
        route.AddParcel(CreateParcelWithAddress(sharedAddress));
        route.AddParcel(CreateParcelWithAddress(sharedAddress));

        // Assert
        route.ParcelCount.Should().Be(3);
        route.EstimatedStops.Should().Be(1);
    }

    [Fact]
    public void RemoveParcel_ShouldRecalculateStops_WhenAddressNoLongerOnRoute()
    {
        // Arrange — 2 parcels at address A, 1 parcel at address B
        var addressA = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 A St",
            City = "City",
            State = "State",
            PostalCode = "11111",
            CountryCode = "US"
        };
        var addressB = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "200 B St",
            City = "City",
            State = "State",
            PostalCode = "22222",
            CountryCode = "US"
        };

        var route = CreateDraftRoute();
        var parcelA1 = CreateParcelWithAddress(addressA);
        var parcelA2 = CreateParcelWithAddress(addressA);
        var parcelB = CreateParcelWithAddress(addressB);
        route.AddParcel(parcelA1);
        route.AddParcel(parcelA2);
        route.AddParcel(parcelB);

        route.EstimatedStops.Should().Be(2);

        // Act — remove parcelB, address B no longer on route
        route.RemoveParcel(parcelB.Id);

        // Assert — only address A remains
        route.ParcelCount.Should().Be(2);
        route.EstimatedStops.Should().Be(1);
    }
}
