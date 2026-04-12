using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class RouteCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly CreateRoute.Handler _createHandler;
    private readonly AddParcelsToRoute.Handler _addParcelsHandler;
    private readonly RemoveParcelFromRoute.Handler _removeParcelHandler;
    private readonly AutoAssignParcels.Handler _autoAssignHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly Driver _driver;
    private readonly Vehicle _vehicle;

    public RouteCommandTests()
    {
        _context = TestAppDbContext.Create<RouteCommandTests>();
        _currentUser = new FakeCurrentUserService();

        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _addParcelsHandler = new AddParcelsToRoute.Handler(_context);
        _removeParcelHandler = new RemoveParcelFromRoute.Handler(_context);
        _autoAssignHandler = new AutoAssignParcels.Handler(_context);

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            Address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "1 Depot Rd",
                City = "City",
                State = "ST",
                PostalCode = "00000",
                CountryCode = "US"
            }
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _driver = Driver.Create(
            "John", "Doe", "555-0100", "john@route.com",
            "DL-TEST", new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: _depot.Id);

        _vehicle = new Vehicle
        {
            Id = Guid.NewGuid(),
            RegistrationPlate = "RT-0001",
            Type = VehicleType.Van,
            Status = VehicleStatus.Available,
            ParcelCapacity = 50,
            WeightCapacity = 500,
            WeightUnit = WeightUnit.Kg,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.Drivers.Add(_driver);
        _context.Vehicles.Add(_vehicle);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateRoute_WithValidInput_CreatesRoute()
    {
        // Arrange
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            _driver.Id,
            _vehicle.Id);

        var command = new CreateRoute.Command(dto);

        // Act
        var result = await _createHandler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.ZoneId.Should().Be(_zone.Id);
        result.ZoneName.Should().Be("North Zone");
        result.DriverId.Should().Be(_driver.Id);
        result.DriverName.Should().Be("John Doe");
        result.VehicleId.Should().Be(_vehicle.Id);
        result.VehiclePlate.Should().Be("RT-0001");
        result.Status.Should().Be(RouteStatus.Draft);
        result.ParcelCount.Should().Be(0);
        result.EstimatedStops.Should().Be(0);
    }

    [Fact]
    public async Task CreateRoute_WithInvalidZoneId_Throws()
    {
        // Arrange
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            Guid.NewGuid(),
            null,
            null);

        var command = new CreateRoute.Command(dto);

        // Act
        var act = () => _createHandler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Zone*not found*");
    }

    [Fact]
    public async Task CreateRoute_WithInvalidDriverId_Throws()
    {
        // Arrange
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            Guid.NewGuid(),
            null);

        var command = new CreateRoute.Command(dto);

        // Act
        var act = () => _createHandler.Handle(command, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Driver*not found*");
    }

    [Fact]
    public async Task CreateRoute_WithoutDriverAndVehicle_CreatesRoute()
    {
        // Arrange
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            null,
            null);

        var command = new CreateRoute.Command(dto);

        // Act
        var result = await _createHandler.Handle(command, CancellationToken.None);

        // Assert
        result.DriverId.Should().BeNull();
        result.VehicleId.Should().BeNull();
        result.Status.Should().Be(RouteStatus.Draft);
    }

    [Fact]
    public async Task AddParcelsToRoute_WithValidParcelIds_AddsParcels()
    {
        // Arrange
        var route = await CreateTestRoute();
        var parcel1 = CreateTestParcel("TRK-001");
        var parcel2 = CreateTestParcel("TRK-002");
        _context.Parcels.AddRange(parcel1, parcel2);
        _context.SaveChanges();

        var dto = new AddParcelsToRouteDto(route.Id, [parcel1.Id, parcel2.Id]);

        // Act
        var result = await _addParcelsHandler.Handle(new AddParcelsToRoute.Command(dto), CancellationToken.None);

        // Assert
        result.ParcelCount.Should().Be(2);
        result.EstimatedStops.Should().Be(2);
    }

    [Fact]
    public async Task AddParcelsToRoute_WithParcelAlreadyOnRoute_SkipsDuplicates()
    {
        // Arrange
        var route = await CreateTestRoute();
        var parcel = CreateTestParcel("TRK-DUP");
        _context.Parcels.Add(parcel);
        _context.SaveChanges();

        var dto1 = new AddParcelsToRouteDto(route.Id, [parcel.Id]);
        await _addParcelsHandler.Handle(new AddParcelsToRoute.Command(dto1), CancellationToken.None);

        // Act — try adding same parcel again (it's now Staged, not Sorted, so handler filters it out)
        var dto2 = new AddParcelsToRouteDto(route.Id, [parcel.Id]);
        var result = await _addParcelsHandler.Handle(new AddParcelsToRoute.Command(dto2), CancellationToken.None);

        // Assert — parcel was skipped, count stays at 1
        result.ParcelCount.Should().Be(1);
    }

    [Fact]
    public async Task AutoAssignParcels_AddsAllSortedParcelsForZone()
    {
        // Arrange
        var route = await CreateTestRoute();
        var parcel1 = CreateTestParcel("TRK-A1", ParcelStatus.Sorted, _zone.Id);
        var parcel2 = CreateTestParcel("TRK-A2", ParcelStatus.Sorted, _zone.Id);
        var parcel3 = CreateTestParcel("TRK-A3", ParcelStatus.Staged, _zone.Id); // Already staged, not eligible
        var parcel4 = CreateTestParcel("TRK-A4", ParcelStatus.Sorted, Guid.NewGuid()); // Different zone
        _context.Parcels.AddRange(parcel1, parcel2, parcel3, parcel4);
        _context.SaveChanges();

        // Act
        var result = await _autoAssignHandler.Handle(
            new AutoAssignParcels.Command(route.Id), CancellationToken.None);

        // Assert — only sorted parcels in matching zone
        result.ParcelCount.Should().Be(2);
        result.EstimatedStops.Should().Be(2);
    }

    [Fact]
    public async Task RemoveParcelFromRoute_WhenDraft_RemovesParcel()
    {
        // Arrange
        var route = await CreateTestRoute();
        var parcel = CreateTestParcel("TRK-RM");
        _context.Parcels.Add(parcel);
        _context.SaveChanges();

        var addDto = new AddParcelsToRouteDto(route.Id, [parcel.Id]);
        await _addParcelsHandler.Handle(new AddParcelsToRoute.Command(addDto), CancellationToken.None);

        // Act
        var removeDto = new RemoveParcelFromRouteDto(route.Id, parcel.Id);
        var result = await _removeParcelHandler.Handle(
            new RemoveParcelFromRoute.Command(removeDto), CancellationToken.None);

        // Assert
        result.ParcelCount.Should().Be(0);
        result.EstimatedStops.Should().Be(0);
    }

    private async Task<RouteDto> CreateTestRoute()
    {
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            _driver.Id,
            _vehicle.Id);

        return await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);
    }

    private Parcel CreateTestParcel(string trackingNumber, ParcelStatus status = ParcelStatus.Sorted, Guid? zoneId = null)
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Test St",
            City = "City",
            State = "ST",
            PostalCode = "12345",
            CountryCode = "US"
        };
        _context.Addresses.Add(address);

        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = trackingNumber,
            Status = status,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            ZoneId = zoneId ?? _zone.Id
        };
    }

    public void Dispose() => _context.Dispose();
}
