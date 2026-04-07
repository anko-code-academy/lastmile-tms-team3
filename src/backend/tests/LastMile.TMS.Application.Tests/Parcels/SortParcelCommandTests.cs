using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;

namespace LastMile.TMS.Application.Tests.Parcels;

public class SortParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly SortParcel.Handler _handler;

    private const string TrackingNumber = "SORT-TEST-001";
    private readonly Guid _zoneId = Guid.NewGuid();
    private readonly Guid _otherZoneId = Guid.NewGuid();
    private readonly Guid _depotId = Guid.NewGuid();

    public SortParcelCommandTests()
    {
        _context = TestAppDbContext.Create<SortParcelCommandTests>();
        _handler = new SortParcel.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var depot = new Depot
        {
            Id = _depotId,
            Name = "Main Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Zone North",
            IsActive = true,
            DepotId = _depotId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var otherZone = new Zone
        {
            Id = _otherZoneId,
            Name = "Zone South",
            IsActive = true,
            DepotId = _depotId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 North St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = true,
            ContactName = "Alice"
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Sender Ave",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            IsResidential = false,
            ContactName = "Bob"
        };

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = TrackingNumber,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.ReceivedAtDepot,
            RecipientAddressId = recipientAddress.Id,
            ShipperAddressId = shipperAddress.Id,
            ZoneId = _zoneId,
            Weight = 2.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 20,
            Width = 15,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Depots.Add(depot);
        _context.Zones.AddRange(zone, otherZone);
        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();
    }

    [Fact]
    public async Task SortParcel_ValidParcel_NoScannedZone_TransitionsToSorted()
    {
        var dto = new SortParcelDto(TrackingNumber, ScannedZoneId: null, OperatorName: "Op1", LocationCity: "Nashville", LocationState: "TN", LocationCountryCode: "US");

        var result = await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Sorted);
        result.ZoneId.Should().Be(_zoneId);
        result.ZoneName.Should().Be("Zone North");
        result.IsMissort.Should().BeFalse();
        result.IsUnsortable.Should().BeFalse();
        result.TrackingNumber.Should().Be(TrackingNumber);
    }

    [Fact]
    public async Task SortParcel_CorrectZoneScanned_TransitionsToSorted_NoMissortFlag()
    {
        var dto = new SortParcelDto(TrackingNumber, ScannedZoneId: _zoneId, OperatorName: "Op1", LocationCity: null, LocationState: null, LocationCountryCode: null);

        var result = await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Sorted);
        result.IsMissort.Should().BeFalse();
        result.IsUnsortable.Should().BeFalse();
    }

    [Fact]
    public async Task SortParcel_WrongZoneScanned_ReturnsMissortFlag_DoesNotTransition()
    {
        var dto = new SortParcelDto(TrackingNumber, ScannedZoneId: _otherZoneId, OperatorName: "Op1", LocationCity: null, LocationState: null, LocationCountryCode: null);

        var result = await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        result.IsMissort.Should().BeTrue();
        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot);
        result.ZoneId.Should().Be(_zoneId);
        result.ZoneName.Should().Be("Zone North");
        result.IsUnsortable.Should().BeFalse();
    }

    [Fact]
    public async Task SortParcel_NoZoneAssigned_TransitionsToException()
    {
        const string noZoneTracking = "SORT-NOZONE-001";

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "Unknown Road",
            City = "Nowhere",
            State = "XX",
            PostalCode = "00000",
            CountryCode = "US",
            IsResidential = true,
            ContactName = "Unknown"
        };
        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Sender St",
            City = "SenderCity",
            State = "SS",
            PostalCode = "12345",
            CountryCode = "US",
            IsResidential = false,
            ContactName = "Sender"
        };

        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = noZoneTracking,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.ReceivedAtDepot,
            RecipientAddressId = recipientAddress.Id,
            ShipperAddressId = shipperAddress.Id,
            ZoneId = null,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 10,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new SortParcelDto(noZoneTracking, ScannedZoneId: null, OperatorName: "Op1", LocationCity: null, LocationState: null, LocationCountryCode: null);

        var result = await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Exception);
        result.IsUnsortable.Should().BeTrue();
        result.IsMissort.Should().BeFalse();
        result.ZoneId.Should().BeNull();
        result.ZoneName.Should().BeNull();
    }

    [Fact]
    public async Task SortParcel_ParcelNotFound_ThrowsParcelNotFoundException()
    {
        var dto = new SortParcelDto("NONEXISTENT-999", ScannedZoneId: null, OperatorName: "Op1", LocationCity: null, LocationState: null, LocationCountryCode: null);

        var act = async () => await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<ParcelNotFoundException>()
            .WithMessage("*NONEXISTENT-999*");
    }

    [Fact]
    public async Task SortParcel_WrongStatus_Registered_ThrowsInvalidStatusTransitionException()
    {
        const string registeredTracking = "SORT-BADSTATUS-001";

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Test St",
            City = "City",
            State = "ST",
            PostalCode = "11111",
            CountryCode = "US",
            IsResidential = true,
            ContactName = "Test"
        };
        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "2 Test St",
            City = "City2",
            State = "ST",
            PostalCode = "22222",
            CountryCode = "US",
            IsResidential = false,
            ContactName = "Test2"
        };

        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = registeredTracking,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddress.Id,
            ShipperAddressId = shipperAddress.Id,
            ZoneId = _zoneId,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 10,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new SortParcelDto(registeredTracking, ScannedZoneId: null, OperatorName: "Op1", LocationCity: null, LocationState: null, LocationCountryCode: null);

        var act = async () => await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task SortParcel_ValidSort_CreatesTrackingEvent()
    {
        var dto = new SortParcelDto(TrackingNumber, ScannedZoneId: null, OperatorName: "Sorter1", LocationCity: "Nashville", LocationState: "TN", LocationCountryCode: "US");

        var result = await _handler.Handle(new SortParcel.Command(dto), CancellationToken.None);

        result.TrackingEvents.Should().HaveCount(1);
        var evt = result.TrackingEvents[0];
        evt.Operator.Should().Be("Sorter1");
        evt.LocationCity.Should().Be("Nashville");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
