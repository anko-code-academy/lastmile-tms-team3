using FluentAssertions;
using FluentValidation;
using LastMile.TMS.Application.Features.Depots.Commands;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Application.Features.Parcels.Validators;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Tests.Parcels;

public class ParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;

    public ParcelCommandTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
    }

    [Fact]
    public async Task CreateParcel_WithValidInput_CreatesParcelWithRegisteredStatus()
    {
        // Arrange
        var recipientAddress = new CreateAddressDto(
            "456 Recipient St",
            null,
            "NewYork",
            "NY",
            "10001",
            "US"
        );
        var shipperAddress = new CreateAddressDto(
            "123 Shipper St",
            null,
            "Los Angeles",
            "CA",
            "90001",
            "US"
        );

        var createDto = new CreateParcelDto(
            Description: "Test parcel",
            ServiceType: ServiceType.Express,
            RecipientAddress: recipientAddress,
            ShipperAddress: shipperAddress,
            Weight: 2.5m,
            WeightUnit: WeightUnit.Kg,
            Length: 30m,
            Width: 20m,
            Height: 15m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m,
            Currency: "USD",
            ParcelType: "Standard",
            Notes: "Handle with care"
        );

        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "Zone A",
            IsActive = true,
            Boundary = new Polygon(new LinearRing(new[]
            {
                new Coordinate(-74.1, 40.7),
                new Coordinate(-73.9, 40.7),
                new Coordinate(-73.9, 40.8),
                new Coordinate(-74.1, 40.8),
                new Coordinate(-74.1, 40.7)
            })) { SRID = 4326 }
        };

        _context.Zones.Add(zone);
        await _context.SaveChangesAsync();

        var mockGeocodingService = new FakeGeocodingService();
        var mockZoneMatchingService = new FakeZoneMatchingService(zone.Id);

        var handler = new CreateParcel.Handler(
            _context,
            _currentUser,
            mockZoneMatchingService,
            mockGeocodingService
        );

        var command = new CreateParcel.Command(createDto);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.TrackingNumber.Should().StartWith("LMT-");
        result.Status.Should().Be(ParcelStatus.Registered);
        result.BarcodeData.Should().Be(result.TrackingNumber);
        result.Description.Should().Be("Test parcel");
        result.ServiceType.Should().Be(ServiceType.Express);
        result.ParcelType.Should().Be("Standard");
        result.Notes.Should().Be("Handle with care");
        result.Weight.Should().Be(2.5m);
        result.WeightUnit.Should().Be(WeightUnit.Kg);
        result.DeclaredValue.Should().Be(100m);
        result.Currency.Should().Be("USD");
        result.DeliveryAttempts.Should().Be(0);
        result.RecipientAddress.Street1.Should().Be("456 Recipient St");
        result.ShipperAddress.Street1.Should().Be("123 Shipper St");
    }

    [Fact]
    public async Task CreateParcel_GeneratesUniqueTrackingNumber()
    {
        // Arrange
        var createDto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("456 R St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("123 S St", null, "LA", "CA", "90001", "US"),
            Weight: 1m,
            WeightUnit: WeightUnit.Kg,
            Length: 10m,
            Width: 10m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 50m
        );

        var mockGeocodingService = new FakeGeocodingService();
        var mockZoneMatchingService = new FakeZoneMatchingService(null);

        var handler = new CreateParcel.Handler(
            _context,
            _currentUser,
            mockZoneMatchingService,
            mockGeocodingService
        );

        var command = new CreateParcel.Command(createDto);

        // Act
        var result1 = await handler.Handle(command, CancellationToken.None);
        var result2 = await handler.Handle(command, CancellationToken.None);

        // Assert
        result1.TrackingNumber.Should().NotBe(result2.TrackingNumber);
        result1.TrackingNumber.Should().MatchRegex(@"^LMT-\d{8}-[A-Z0-9]{6}$");
        result2.TrackingNumber.Should().MatchRegex(@"^LMT-\d{8}-[A-Z0-9]{6}$");
    }

    [Fact]
    public async Task CreateParcel_WithCoordinates_SkipsGeocoding()
    {
        // Arrange
        var recipientAddress = new CreateAddressDto(
            "123 Main St",
            null,
            "Boston",
            "MA",
            "02101",
            "US",
            Latitude: 42.3601,
            Longitude: -71.0589
        );
        var shipperAddress = new CreateAddressDto(
            "456 Oak Ave",
            null,
            "Cambridge",
            "MA",
            "02139",
            "US",
            Latitude: 42.3736,
            Longitude: -122.3193
        );

        var createDto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: recipientAddress,
            ShipperAddress: shipperAddress,
            Weight: 1m,
            WeightUnit: WeightUnit.Kg,
            Length: 10m,
            Width: 10m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 50m
        );

        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "Zone MA",
            IsActive = true,
            Boundary = new Polygon(new LinearRing(new[]
            {
                new Coordinate(-71.1, 42.35),
                new Coordinate(-70.9, 42.35),
                new Coordinate(-70.9, 42.4),
                new Coordinate(-71.1, 42.4),
                new Coordinate(-71.1, 42.35)
            })) { SRID = 4326 }
        };

        _context.Zones.Add(zone);
        await _context.SaveChangesAsync();

        var mockGeocodingService = new SpyGeocodingService();
        var mockZoneMatchingService = new FakeZoneMatchingService(zone.Id);

        var handler = new CreateParcel.Handler(
            _context,
            _currentUser,
            mockZoneMatchingService,
            mockGeocodingService
        );

        var command = new CreateParcel.Command(createDto);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        mockGeocodingService.GeocodeAsyncCalled.Should().BeFalse();
        result.RecipientAddress.Latitude.Should().Be(42.3601);
        result.RecipientAddress.Longitude.Should().Be(-71.0589);
        result.ShipperAddress.Latitude.Should().Be(42.3736);
        result.ShipperAddress.Longitude.Should().Be(-122.3193);
    }

    [Fact]
    public async Task CreateParcel_WithNoMatchingZone_ZoneIdIsNull()
    {
        // Arrange
        var createDto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("999 Nowhere Ln", null, "Desert", "XX", "00000", "XX"),
            ShipperAddress: new CreateAddressDto("123 S St", null, "LA", "CA", "90001", "US"),
            Weight: 1m,
            WeightUnit: WeightUnit.Kg,
            Length: 10m,
            Width: 10m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 50m
        );

        var mockGeocodingService = new FakeGeocodingService { Latitude = 0, Longitude = 0 };
        var mockZoneMatchingService = new FakeZoneMatchingService(null);

        var handler = new CreateParcel.Handler(
            _context,
            _currentUser,
            mockZoneMatchingService,
            mockGeocodingService
        );

        var command = new CreateParcel.Command(createDto);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.ZoneId.Should().BeNull();
        result.ZoneName.Should().BeNull();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

public class ParcelValidatorTests
{
    private readonly CreateParcelValidator _validator;

    public ParcelValidatorTests()
    {
        _validator = new CreateParcelValidator();
    }

    [Fact]
    public async Task CreateParcelValidator_ValidInput_NoErrors()
    {
        var dto = new CreateParcelDto(
            Description: "Test",
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("123 Main St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 2m,
            WeightUnit: WeightUnit.Kg,
            Length: 20m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateParcelValidator_WeightZero_HasError()
    {
        var dto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("123 Main St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 0m,
            WeightUnit: WeightUnit.Kg,
            Length: 20m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("Weight"));
    }

    [Fact]
    public async Task CreateParcelValidator_NegativeDimensions_HasError()
    {
        var dto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("123 Main St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 2m,
            WeightUnit: WeightUnit.Kg,
            Length: -5m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("Length"));
    }

    [Fact]
    public async Task CreateParcelValidator_NegativeDeclaredValue_HasError()
    {
        var dto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("123 Main St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 2m,
            WeightUnit: WeightUnit.Kg,
            Length: 20m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: -10m
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("DeclaredValue"));
    }

    [Fact]
    public async Task CreateParcelValidator_NotesTooLong_HasError()
    {
        var dto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: new CreateAddressDto("123 Main St", null, "NYC", "NY", "10001", "US"),
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 2m,
            WeightUnit: WeightUnit.Kg,
            Length: 20m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m,
            Notes: new string('x', 501)
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("Notes"));
    }

    [Fact]
    public async Task CreateParcelValidator_MissingRecipientAddress_HasError()
    {
        var dto = new CreateParcelDto(
            Description: null,
            ServiceType: ServiceType.Standard,
            RecipientAddress: null!,
            ShipperAddress: new CreateAddressDto("456 Oak Ave", null, "LA", "CA", "90001", "US"),
            Weight: 2m,
            WeightUnit: WeightUnit.Kg,
            Length: 20m,
            Width: 15m,
            Height: 10m,
            DimensionUnit: DimensionUnit.Cm,
            DeclaredValue: 100m
        );

        var command = new CreateParcel.Command(dto);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName.Contains("RecipientAddress"));
    }
}

public class ParcelMapperTests
{
    [Fact]
    public void ToDto_WithValidParcel_MapsAllFields()
    {
        // Arrange
        var parcelId = Guid.NewGuid();
        var recipientAddressId = Guid.NewGuid();
        var shipperAddressId = Guid.NewGuid();
        var zoneId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var recipientAddress = new Address
        {
            Id = recipientAddressId,
            Street1 = "456 R St",
            City = "NYC",
            State = "NY",
            PostalCode = "10001",
            CountryCode = "US",
            GeoLocation = new Point(-71.0589, 40.7128) { SRID = 4326 }
        };

        var shipperAddress = new Address
        {
            Id = shipperAddressId,
            Street1 = "123 S St",
            City = "LA",
            State = "CA",
            PostalCode = "90001",
            CountryCode = "US",
            GeoLocation = new Point(-122.4194, 37.7749) { SRID = 4326 }
        };

        var zone = new Zone
        {
            Id = zoneId,
            Name = "Zone A"
        };

        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "LMT-20260405-ABC123",
            BarcodeData = "LMT-20260405-ABC123",
            Description = "Important documents",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddressId,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddressId,
            ShipperAddress = shipperAddress,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30m,
            Width = 20m,
            Height = 15m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 150m,
            Currency = "EUR",
            ParcelType = "Documents",
            Notes = "Fragile",
            ZoneId = zoneId,
            Zone = zone,
            CreatedAt = now,
            LastModifiedAt = null
        };

        // Act
        var dto = ParcelMapper.ToDto(parcel);

        // Assert
        dto.Id.Should().Be(parcelId);
        dto.TrackingNumber.Should().Be("LMT-20260405-ABC123");
        dto.BarcodeData.Should().Be("LMT-20260405-ABC123");
        dto.Description.Should().Be("Important documents");
        dto.ServiceType.Should().Be(ServiceType.Express);
        dto.Status.Should().Be(ParcelStatus.Registered);
        dto.RecipientAddress.Street1.Should().Be("456 R St");
        dto.RecipientAddress.Latitude.Should().Be(40.7128);
        dto.RecipientAddress.Longitude.Should().Be(-71.0589);
        dto.ShipperAddress.Street1.Should().Be("123 S St");
        dto.ShipperAddress.Latitude.Should().Be(37.7749);
        dto.ShipperAddress.Longitude.Should().Be(-122.4194);
        dto.Weight.Should().Be(2.5m);
        dto.WeightUnit.Should().Be(WeightUnit.Kg);
        dto.DeclaredValue.Should().Be(150m);
        dto.Currency.Should().Be("EUR");
        dto.ParcelType.Should().Be("Documents");
        dto.Notes.Should().Be("Fragile");
        dto.ZoneId.Should().Be(zoneId);
        dto.ZoneName.Should().Be("Zone A");
    }

    [Fact]
    public void ToDto_WithNullBarcodeData_FallsBackToTrackingNumber()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST-001",
            BarcodeData = null,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            Status = ParcelStatus.Registered,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var dto = ParcelMapper.ToDto(parcel);

        // Assert
        dto.BarcodeData.Should().Be(parcel.TrackingNumber);
    }

    [Fact]
    public void ToDto_WithNullZone_ZoneNameIsNull()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST-002",
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            Status = ParcelStatus.Registered,
            ZoneId = null,
            Zone = null,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var dto = ParcelMapper.ToDto(parcel);

        // Assert
        dto.ZoneId.Should().BeNull();
        dto.ZoneName.Should().BeNull();
    }

    [Fact]
    public void ToDto_WithDeliveryConfirmation_MapsConfirmation()
    {
        // Arrange
        var confirmationId = Guid.NewGuid();
        var parcelId = Guid.NewGuid();
        var parcel = new Parcel
        {
            Id = parcelId,
            TrackingNumber = "LMT-TEST-003",
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            Status = ParcelStatus.Delivered,
            DeliveryConfirmation = new DeliveryConfirmation
            {
                Id = confirmationId,
                ParcelId = parcelId,
                ReceivedBy = "John Doe",
                DeliveryLocation = "Front door",
                SignatureImage = "sig_base64",
                Photo = "photo_base64",
                DeliveredAt = DateTimeOffset.UtcNow,
                DeliveryGeoLocation = new Point(-71.0589, 40.7128) { SRID = 4326 },
                CreatedAt = DateTimeOffset.UtcNow
            },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var dto = ParcelMapper.ToDto(parcel);

        // Assert
        dto.DeliveryConfirmation.Should().NotBeNull();
        dto.DeliveryConfirmation!.Id.Should().Be(confirmationId);
        dto.DeliveryConfirmation.ReceivedBy.Should().Be("John Doe");
        dto.DeliveryConfirmation.DeliveryLocation.Should().Be("Front door");
        dto.DeliveryConfirmation.Latitude.Should().Be(40.7128);
        dto.DeliveryConfirmation.Longitude.Should().Be(-71.0589);
    }

    [Fact]
    public void ToDto_WithoutDeliveryConfirmation_ReturnsNull()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST-004",
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            Status = ParcelStatus.Registered,
            DeliveryConfirmation = null,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var dto = ParcelMapper.ToDto(parcel);

        // Assert
        dto.DeliveryConfirmation.Should().BeNull();
    }
}

public class ParcelDomainTests
{
    [Fact]
    public void TransitionToStatus_RegisteredToReceivedAtDepot_Succeeds()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.Registered,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        parcel.TransitionToStatus(ParcelStatus.ReceivedAtDepot);

        // Assert
        parcel.Status.Should().Be(ParcelStatus.ReceivedAtDepot);
        parcel.TrackingEvents.Should().HaveCount(1);
        parcel.TrackingEvents.First().EventType.Should().Be(EventType.ArrivedAtFacility);
    }

    [Fact]
    public void TransitionToStatus_InvalidTransition_ThrowsException()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.Registered,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var act = () => parcel.TransitionToStatus(ParcelStatus.Delivered);

        // Assert
        act.Should().Throw<LastMile.TMS.Domain.Exceptions.InvalidStatusTransitionException>();
    }

    [Fact]
    public void TransitionToStatus_FromTerminalState_ThrowsException()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.Delivered,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var act = () => parcel.TransitionToStatus(ParcelStatus.Cancelled);

        // Assert
        act.Should().Throw<LastMile.TMS.Domain.Exceptions.ParcelInTerminalStateException>();
    }

    [Fact]
    public void MarkAsDelivered_FromOutForDelivery_SetsDeliveredStatus()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.OutForDelivery,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        parcel.MarkAsDelivered(
            receivedBy: "Jane Doe",
            deliveryLocation: "Back door",
            signatureImage: "sig_data",
            photo: "photo_data",
            deliveryGeoLocation: new Point(-71.0589, 40.7128) { SRID = 4326 },
            operatorName: "Driver Joe"
        );

        // Assert
        parcel.Status.Should().Be(ParcelStatus.Delivered);
        parcel.ActualDeliveryDate.Should().NotBeNull();
        parcel.DeliveryConfirmation.Should().NotBeNull();
        parcel.DeliveryConfirmation!.ReceivedBy.Should().Be("Jane Doe");
        parcel.DeliveryConfirmation.DeliveryLocation.Should().Be("Back door");
        parcel.DeliveryConfirmation.DeliveryGeoLocation.Should().NotBeNull();
    }

    [Fact]
    public void IncrementDeliveryAttempts_UnderLimit_Succeeds()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.OutForDelivery,
            DeliveryAttempts = 0,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        parcel.IncrementDeliveryAttempts();

        // Assert
        parcel.DeliveryAttempts.Should().Be(1);
    }

    [Fact]
    public void IncrementDeliveryAttempts_AtMaxLimit_ThrowsException()
    {
        // Arrange
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-TEST",
            Status = ParcelStatus.OutForDelivery,
            DeliveryAttempts = 3,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address { Street1 = "1 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            ShipperAddressId = Guid.NewGuid(),
            ShipperAddress = new Address { Street1 = "2 St", City = "C", State = "S", PostalCode = "12345", CountryCode = "US" },
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Act
        var act = () => parcel.IncrementDeliveryAttempts();

        // Assert
        act.Should().Throw<LastMile.TMS.Domain.Exceptions.MaxDeliveryAttemptsReachedException>();
    }
}

// Fake implementations for testing

public class FakeGeocodingService : LastMile.TMS.Application.Common.Interfaces.IGeocodingService
{
    public double Latitude { get; set; } = 40.7128;
    public double Longitude { get; set; } = -71.0589;

    public Task<LastMile.TMS.Application.Common.Interfaces.GeocodingResult?> GeocodeAsync(
        string street,
        string city,
        string state,
        string postalCode,
        string countryCode,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<LastMile.TMS.Application.Common.Interfaces.GeocodingResult?>(
            new LastMile.TMS.Application.Common.Interfaces.GeocodingResult(Latitude, Longitude));
    }
}

public class SpyGeocodingService : LastMile.TMS.Application.Common.Interfaces.IGeocodingService
{
    public bool GeocodeAsyncCalled { get; private set; }

    public Task<LastMile.TMS.Application.Common.Interfaces.GeocodingResult?> GeocodeAsync(
        string street,
        string city,
        string state,
        string postalCode,
        string countryCode,
        CancellationToken cancellationToken = default)
    {
        GeocodeAsyncCalled = true;
        return Task.FromResult<LastMile.TMS.Application.Common.Interfaces.GeocodingResult?>(
            new LastMile.TMS.Application.Common.Interfaces.GeocodingResult(40.7128, -71.0589));
    }
}

public class FakeZoneMatchingService : LastMile.TMS.Application.Services.IZoneMatchingService
{
    private readonly Guid? _zoneId;

    public FakeZoneMatchingService(Guid? zoneId)
    {
        _zoneId = zoneId;
    }

    public Task<Guid?> FindMatchingZoneIdAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
        => Task.FromResult(_zoneId);

    public Task<Guid?> FindMatchingZoneIdAsync(Point point, CancellationToken cancellationToken = default)
        => Task.FromResult(_zoneId);
}
