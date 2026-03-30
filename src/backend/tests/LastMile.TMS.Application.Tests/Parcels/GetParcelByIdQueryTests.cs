using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Tests.Parcels;

public class GetParcelByIdQueryTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly GetParcelById.Handler _handler;

    private readonly Guid _parcelId = Guid.NewGuid();

    public GetParcelByIdQueryTests()
    {
        _context = TestAppDbContext.Create<GetParcelByIdQueryTests>();
        _handler = new GetParcelById.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test Street",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US",
            ContactName = "Alice Recipient",
            CompanyName = "TestCorp",
            IsResidential = true
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Sender Ave",
            City = "SenderCity",
            State = "SS",
            PostalCode = "54321",
            CountryCode = "US",
            ContactName = "Bob Sender",
            CompanyName = null,
            IsResidential = false
        };

        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "Test Zone",
            DepotId = Guid.NewGuid(),
            IsActive = true
        };

        var trackingEvent = new TrackingEvent
        {
            Id = Guid.NewGuid(),
            ParcelId = _parcelId,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-2),
            EventType = EventType.LabelCreated,
            Description = "Label created",
            LocationCity = "TestCity",
            LocationState = "TS",
            LocationCountryCode = "US",
            Operator = "System",
            CreatedAt = DateTimeOffset.UtcNow.AddHours(-2)
        };

        var contentItem = new ParcelContentItem
        {
            Id = Guid.NewGuid(),
            ParcelId = _parcelId,
            HsCode = "1234.56",
            Description = "Test Item",
            Quantity = 2,
            UnitValue = 50,
            Currency = "USD",
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            OriginCountryCode = "US",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var watcher = new ParcelWatcher
        {
            Id = Guid.NewGuid(),
            Email = "watcher@example.com",
            Name = "Test Watcher",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var deliveryConfirmation = new DeliveryConfirmation
        {
            Id = Guid.NewGuid(),
            ParcelId = _parcelId,
            ReceivedBy = "Alice Recipient",
            DeliveryLocation = "Front Door",
            SignatureImage = null,
            Photo = null,
            DeliveredAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = "PKG-TEST-001",
            Description = "Test parcel description",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Delivered,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30,
            Width = 20,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 500,
            Currency = "USD",
            EstimatedDeliveryDate = DateTimeOffset.UtcNow.AddDays(-1),
            ActualDeliveryDate = DateTimeOffset.UtcNow,
            DeliveryAttempts = 1,
            ParcelType = "Express",
            ZoneId = zone.Id,
            Zone = zone,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-5),
            LastModifiedAt = DateTimeOffset.UtcNow,
            TrackingEvents = new List<TrackingEvent> { trackingEvent },
            ContentItems = new List<ParcelContentItem> { contentItem },
            Watchers = new List<ParcelWatcher> { watcher },
            DeliveryConfirmation = deliveryConfirmation
        };

        _context.Addresses.Add(recipientAddress);
        _context.Addresses.Add(shipperAddress);
        _context.Zones.Add(zone);
        _context.Parcels.Add(parcel);
        _context.TrackingEvents.Add(trackingEvent);
        _context.ParcelContentItems.Add(contentItem);
        _context.ParcelWatchers.Add(watcher);
        _context.DeliveryConfirmations.Add(deliveryConfirmation);
        _context.SaveChanges();
    }

    [Fact]
    public async Task ReturnsParcel_WhenFound()
    {
        var query = new GetParcelById.Query(_parcelId);

        var result = await _handler.Handle(query, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(_parcelId);
        result.TrackingNumber.Should().Be("PKG-TEST-001");
        result.Status.Should().Be(ParcelStatus.Delivered);
        result.ServiceType.Should().Be(ServiceType.Express);
        result.DeclaredValue.Should().Be(500);
        result.Currency.Should().Be("USD");
        result.Weight.Should().Be(2.5m);
        result.ParcelType.Should().Be("Express");
        result.ZoneName.Should().Be("Test Zone");
        result.RecipientAddress.City.Should().Be("TestCity");
        result.ShipperAddress.City.Should().Be("SenderCity");
    }

    [Fact]
    public async Task ReturnsAllNestedCollections_WhenPopulated()
    {
        var query = new GetParcelById.Query(_parcelId);

        var result = await _handler.Handle(query, CancellationToken.None);

        result.Should().NotBeNull();
        result!.TrackingEvents.Should().HaveCount(1);
        result.TrackingEvents[0].EventType.Should().Be(EventType.LabelCreated);
        result.ContentItems.Should().HaveCount(1);
        result.ContentItems[0].HsCode.Should().Be("1234.56");
        result.Watchers.Should().HaveCount(1);
        result.Watchers[0].Email.Should().Be("watcher@example.com");
        result.DeliveryConfirmation.Should().NotBeNull();
        result.DeliveryConfirmation!.ReceivedBy.Should().Be("Alice Recipient");
    }

    [Fact]
    public async Task ThrowsKeyNotFoundException_WhenNotFound()
    {
        var query = new GetParcelById.Query(Guid.NewGuid());

        var act = async () => await _handler.Handle(query, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
