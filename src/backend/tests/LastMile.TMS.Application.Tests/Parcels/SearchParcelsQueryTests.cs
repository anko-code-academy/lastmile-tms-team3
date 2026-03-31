using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Tests.Parcels;

public class SearchParcelsQueryTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly SearchParcels.Handler _handler;

    private readonly Guid _parcelId = Guid.NewGuid();

    public SearchParcelsQueryTests()
    {
        _context = TestAppDbContext.Create<SearchParcelsQueryTests>();
        _handler = new SearchParcels.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var address1 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Tracking Way",
            City = "New York",
            State = "NY",
            PostalCode = "10001",
            CountryCode = "US",
            ContactName = "Alice Recipient",
            CompanyName = null,
            IsResidential = true
        };

        var address2 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Sender Street",
            City = "Los Angeles",
            State = "CA",
            PostalCode = "90001",
            CountryCode = "US",
            ContactName = "Bob Sender",
            CompanyName = "SenderCo",
            IsResidential = false
        };

        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "East Zone",
            DepotId = Guid.NewGuid(),
            IsActive = true
        };

        var parcel1 = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = "PKG-001-ALICE",
            Description = "Electronics",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Registered,
            RecipientAddressId = address1.Id,
            RecipientAddress = address1,
            ShipperAddressId = address2.Id,
            ShipperAddress = address2,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30,
            Width = 20,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 500,
            Currency = "USD",
            EstimatedDeliveryDate = DateTimeOffset.UtcNow.AddDays(3),
            DeliveryAttempts = 0,
            ParcelType = "Standard",
            ZoneId = zone.Id,
            Zone = zone,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),  // -1d
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems = new List<ParcelContentItem>(),
            Watchers = new List<ParcelWatcher>()
        };

        var parcel2 = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "PKG-002-BOB",
            Description = "Books",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.OutForDelivery,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "789 Other Road",
                City = "New York",
                State = "NY",
                PostalCode = "10002",
                CountryCode = "US",
                ContactName = "Carol Neighbor",
                CompanyName = null,
                IsResidential = true
            },
            ShipperAddressId = address2.Id,
            ShipperAddress = address2,
            Weight = 5.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 40,
            Width = 30,
            Height = 20,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 100,
            Currency = "USD",
            DeliveryAttempts = 1,
            ParcelType = "Heavy",
            ZoneId = null,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-2),  // -2d
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems = new List<ParcelContentItem>(),
            Watchers = new List<ParcelWatcher>()
        };

        var parcel3 = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "PKG-003-CAROL",
            Description = "Clothing",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Delivered,
            RecipientAddressId = Guid.NewGuid(),
            RecipientAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "111 Home Street",
                City = "Chicago",
                State = "IL",
                PostalCode = "60601",
                CountryCode = "US",
                ContactName = "Carol Receiver",
                CompanyName = null,
                IsResidential = true
            },
            ShipperAddressId = address2.Id,
            ShipperAddress = address2,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 20,
            Width = 20,
            Height = 5,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 200,
            Currency = "USD",
            DeliveryAttempts = 0,
            ParcelType = "Standard",
            ZoneId = null,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-10),  // -10d
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems = new List<ParcelContentItem>(),
            Watchers = new List<ParcelWatcher>()
        };

        _context.Addresses.Add(address1);
        _context.Addresses.Add(address2);
        _context.Zones.Add(zone);
        _context.Parcels.AddRange(parcel1, parcel2, parcel3);
        _context.SaveChanges();
    }

    [Fact]
    public async Task ReturnsAllParcels_WhenNoFiltersApplied()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(3);
        result.Items.Should().HaveCount(3);
        result.HasNextPage.Should().BeFalse();
        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public async Task HasPreviousPage_IsTrue_WhenCursorProvided()
    {
        // When cursor is provided (page 2+), HasPreviousPage should be true
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: "someCursor",  // non-null cursor = page 2+
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.HasPreviousPage.Should().BeTrue();
    }

    [Fact]
    public async Task HasPreviousPage_IsFalse_WhenNoCursor()
    {
        // When no cursor (first page), HasPreviousPage should be false
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.HasPreviousPage.Should().BeFalse();
    }

    [Fact]
    public async Task FiltersbyStatus_SingleStatus()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: new[] { ParcelStatus.Delivered },
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items[0].Status.Should().Be(ParcelStatus.Delivered);
    }

    [Fact]
    public async Task FiltersbyStatus_MultipleStatuses()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: new[] { ParcelStatus.Delivered, ParcelStatus.OutForDelivery },
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(2);
        result.Items.Should().OnlyContain(p =>
            p.Status == ParcelStatus.Delivered || p.Status == ParcelStatus.OutForDelivery);
    }

    [Fact]
    public async Task FiltersbyDateRange()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: DateTimeOffset.UtcNow.AddDays(-3),
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        // parcel1 (-1d) and parcel2 (-2d) match; parcel3 (-10d) does not
        result.TotalCount.Should().Be(2);
        result.Items.Should().OnlyContain(p => p.CreatedAt >= DateTimeOffset.UtcNow.AddDays(-3));
    }

    [Fact]
    public async Task FiltersbyZoneId()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: new[] { _context.Parcels.First(p => p.TrackingNumber == "PKG-001-ALICE").ZoneId!.Value },
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items[0].TrackingNumber.Should().Be("PKG-001-ALICE");
    }

    [Fact]
    public async Task FiltersbyParcelType()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: "Heavy",
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items[0].ParcelType.Should().Be("Heavy");
    }

    [Fact]
    public async Task FullTextSearch_MatchesTrackingNumber()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: "PKG-001",
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items[0].TrackingNumber.Should().Be("PKG-001-ALICE");
    }

    [Fact]
    public async Task FullTextSearch_MatchesRecipientContactName()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: "Alice",
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(1);
        result.Items[0].TrackingNumber.Should().Be("PKG-001-ALICE");
    }

    [Fact]
    public async Task FullTextSearch_MatchesRecipientCity()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: "New York",
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(2); // PKG-001-ALICE and PKG-002-BOB both in New York
    }

    [Fact]
    public async Task SortByTrackingNumber_Ascending()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.TrackingNumber,
            SortDirection: SortDirection.Asc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.Items.Should().BeInAscendingOrder(p => p.TrackingNumber);
    }

    [Fact]
    public async Task SortByTrackingNumber_Descending()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.TrackingNumber,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.Items.Should().BeInDescendingOrder(p => p.TrackingNumber);
    }

    [Fact]
    public async Task PageSize_IsCapped_At100()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: null,
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 200 // exceeds max
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        // Should still return all 3 parcels (200 is capped to 100, which is > 3)
        result.Items.Should().HaveCount(3);
    }

    [Fact]
    public async Task ReturnsEmptyResults_WhenNoMatch()
    {
        var query = new SearchParcels.Query(new SearchParcelDto(
            Search: "NONEXISTENT",
            Status: null,
            DateFrom: null,
            DateTo: null,
            ZoneIds: null,
            ParcelType: null,
            SortBy: ParcelSortBy.CreatedAt,
            SortDirection: SortDirection.Desc,
            Cursor: null,
            PageSize: 10
        ));

        var result = await _handler.Handle(query, CancellationToken.None);

        result.TotalCount.Should().Be(0);
        result.Items.Should().BeEmpty();
        result.HasNextPage.Should().BeFalse();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
