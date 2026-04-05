using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Parcels;

public class ParcelQueriesIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>, IAsyncDisposable
{
    private readonly HttpClient _client = factory.CreateClient();

    private readonly Guid _parcelId = Guid.NewGuid();
    private readonly Guid _parcelId2 = Guid.NewGuid();
    private readonly Guid _recipientAddressId = Guid.NewGuid();
    private readonly Guid _shipperAddressId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();
    private readonly Guid _depotId = Guid.NewGuid();

    [Fact]
    public async Task Parcels_ReturnsConnectionResults()
    {
        await InsertTestParcelsAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query {
                parcels(first: 10, order: [{ createdAt: DESC }]) {
                    totalCount
                    nodes {
                        id
                        trackingNumber
                        status
                        serviceType
                        contentItemsCount
                        createdAt
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);

        body.TryGetProperty("errors", out var errors).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("parcels");
        data.GetProperty("totalCount").GetInt32().Should().BeGreaterThan(0);
        data.GetProperty("nodes").GetArrayLength().Should().BeGreaterThan(0);

        var matchingNode = data.GetProperty("nodes")
            .EnumerateArray()
            .FirstOrDefault(node => node.GetProperty("id").GetString() == _parcelId.ToString());

        matchingNode.ValueKind.Should().NotBe(System.Text.Json.JsonValueKind.Undefined);
        matchingNode.GetProperty("contentItemsCount").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task Parcels_RequiresAuthentication()
    {
        var query = @"
            query {
                parcels(first: 10) {
                    nodes { id }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, null);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out var err).Should().BeTrue();
    }

    [Fact]
    public async Task Parcels_FiltersByStatus()
    {
        // Insert a parcel with unique tracking number that we'll specifically search for
        await InsertUniqueStatusParcelAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query {
                parcels(
                    first: 10
                    search: ""UNIQUE""
                    where: { status: { eq: REGISTERED } }
                    order: [{ createdAt: DESC }]
                ) {
                    totalCount
                    nodes {
                        id
                        status
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("parcels");
        data.GetProperty("totalCount").GetInt32().Should().Be(1);
        var status = data.GetProperty("nodes")[0].GetProperty("status").GetString();
        status.Should().Be("REGISTERED");
    }

    [Fact]
    public async Task Parcels_Search_MatchesPrefixAndFullTextFields()
    {
        await InsertUniqueStatusParcelAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query {
                parcels(first: 10, search: ""Filter Recipient"", order: [{ createdAt: DESC }]) {
                    totalCount
                    nodes {
                        id
                        trackingNumber
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("parcels");
        data.GetProperty("totalCount").GetInt32().Should().Be(1);
        data.GetProperty("nodes")[0].GetProperty("trackingNumber").GetString()
            .Should().Be("UNIQUE-FILTER-TEST");
    }

    [Fact]
    public async Task Parcels_FiltersByZoneAndParcelType()
    {
        await InsertTestParcelsAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetParcels($zoneId: UUID!) {
                parcels(
                    first: 10
                    where: {
                        zoneId: { eq: $zoneId }
                        parcelType: { eq: ""Standard"" }
                    }
                    order: [{ createdAt: DESC }]
                ) {
                    totalCount
                    nodes {
                        id
                        trackingNumber
                        parcelType
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { zoneId = _zoneId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var data = body.GetProperty("data").GetProperty("parcels");
        data.GetProperty("totalCount").GetInt32().Should().Be(1);
        data.GetProperty("nodes")[0].GetProperty("parcelType").GetString().Should().Be("Standard");
    }

    [Fact]
    public async Task GetParcel_ReturnsParcelWithNestedCollections()
    {
        await InsertParcelWithNestedDataAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetParcel($id: UUID!) {
                parcel(id: $id) {
                    id
                    trackingNumber
                    status
                    serviceType
                    recipientAddress {
                        city
                        contactName
                    }
                    trackingEvents {
                        id
                        eventType
                        description
                    }
                    contentItems {
                        id
                        hsCode
                        description
                    }
                    watchers {
                        id
                        email
                    }
                    deliveryConfirmation {
                        receivedBy
                        deliveredAt
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { id = _parcelId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var parcel = body.GetProperty("data").GetProperty("parcel");
        parcel.GetProperty("id").GetString().Should().Be(_parcelId.ToString());
        parcel.GetProperty("trackingNumber").GetString().Should().Contain("PKG-TEST-");
        parcel.GetProperty("recipientAddress").GetProperty("city").GetString().Should().Be("TestCity");
        parcel.GetProperty("trackingEvents").GetArrayLength().Should().Be(1);
        parcel.GetProperty("contentItems").GetArrayLength().Should().Be(1);
        parcel.GetProperty("watchers").GetArrayLength().Should().Be(1);
        parcel.GetProperty("deliveryConfirmation").ValueKind.Should()
            .NotBe(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task GetParcel_ReturnsNull_WhenNotFound()
    {
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);
        var nonExistentId = Guid.NewGuid();

        var query = @"
            query GetParcel($id: UUID!) {
                parcel(id: $id) {
                    id
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { id = nonExistentId }, token);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        var parcel = body.GetProperty("data").GetProperty("parcel");
        parcel.ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task GetParcel_RequiresAuthentication()
    {
        var query = @"
            query GetParcel($id: UUID!) {
                parcel(id: $id) { id }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(_client, query, new { id = _parcelId }, null);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeTrue();
    }

    private async Task InsertTestParcelsAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var recipientAddress = new Address
        {
            Id = _recipientAddressId,
            Street1 = "123 Test Street",
            City = "New York",
            State = "NY",
            PostalCode = "10001",
            CountryCode = "US",
            ContactName = "Alice Recipient",
            IsResidential = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var shipperAddress = new Address
        {
            Id = _shipperAddressId,
            Street1 = "456 Sender Avenue",
            City = "Los Angeles",
            State = "CA",
            PostalCode = "90001",
            CountryCode = "US",
            ContactName = "Bob Sender",
            IsResidential = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            AddressId = _recipientAddressId,
            Address = recipientAddress,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Test Zone",
            DepotId = _depotId,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel1 = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = $"PKG-TEST-{_parcelId.ToString().Substring(0, 8).ToUpper()}",
            Description = "Test parcel 1",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Registered,
            RecipientAddressId = _recipientAddressId,
            RecipientAddress = recipientAddress,
            ShipperAddressId = _shipperAddressId,
            ShipperAddress = shipperAddress,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30,
            Width = 20,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 500,
            Currency = "USD",
            ParcelType = "Standard",
            ZoneId = _zoneId,
            Zone = zone,
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems =
            [
                new ParcelContentItem
                {
                    Id = Guid.NewGuid(),
                    ParcelId = _parcelId,
                    HsCode = "1234.56",
                    Description = "Widget",
                    Quantity = 1,
                    UnitValue = 150,
                    Currency = "USD",
                    Weight = 1.0m,
                    WeightUnit = WeightUnit.Kg,
                    OriginCountryCode = "US",
                    CreatedAt = DateTimeOffset.UtcNow
                },
                new ParcelContentItem
                {
                    Id = Guid.NewGuid(),
                    ParcelId = _parcelId,
                    HsCode = "6543.21",
                    Description = "Accessory",
                    Quantity = 2,
                    UnitValue = 25,
                    Currency = "USD",
                    Weight = 0.5m,
                    WeightUnit = WeightUnit.Kg,
                    OriginCountryCode = "US",
                    CreatedAt = DateTimeOffset.UtcNow
                }
            ],
            Watchers = new List<ParcelWatcher>()
        };

        var parcel2 = new Parcel
        {
            Id = _parcelId2,
            TrackingNumber = $"PKG-TEST-{_parcelId2.ToString().Substring(0, 8).ToUpper()}",
            Description = "Test parcel 2",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.OutForDelivery,
            RecipientAddressId = _recipientAddressId,
            RecipientAddress = recipientAddress,
            ShipperAddressId = _shipperAddressId,
            ShipperAddress = shipperAddress,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 20,
            Width = 15,
            Height = 5,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 100,
            Currency = "USD",
            ParcelType = "Light",
            ZoneId = null,
            DeliveryAttempts = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-5),
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems = new List<ParcelContentItem>(),
            Watchers = new List<ParcelWatcher>()
        };

        await db.Addresses.AddRangeAsync(recipientAddress, shipperAddress);
        await db.Depots.AddAsync(depot);
        await db.Zones.AddAsync(zone);
        await db.Parcels.AddRangeAsync(parcel1, parcel2);
        await db.SaveChangesAsync();
    }

    private async Task InsertParcelWithNestedDataAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existingParcel = await db.Parcels.FindAsync(_parcelId);
        if (existingParcel != null) return; // already inserted by InsertTestParcelsAsync

        var recipientAddress = new Address
        {
            Id = _recipientAddressId,
            Street1 = "123 Test Street",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US",
            ContactName = "Alice Recipient",
            CompanyName = "TestCorp",
            IsResidential = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var shipperAddress = new Address
        {
            Id = _shipperAddressId,
            Street1 = "456 Sender Avenue",
            City = "SenderCity",
            State = "SS",
            PostalCode = "54321",
            CountryCode = "US",
            ContactName = "Bob Sender",
            IsResidential = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            AddressId = _recipientAddressId,
            Address = recipientAddress,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Test Zone",
            DepotId = _depotId,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
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
            DeliveredAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = $"PKG-TEST-{_parcelId.ToString().Substring(0, 8).ToUpper()}",
            Description = "Test parcel with nested data",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Delivered,
            RecipientAddressId = _recipientAddressId,
            RecipientAddress = recipientAddress,
            ShipperAddressId = _shipperAddressId,
            ShipperAddress = shipperAddress,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30,
            Width = 20,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 500,
            Currency = "USD",
            ParcelType = "Standard",
            ZoneId = _zoneId,
            Zone = zone,
            DeliveryAttempts = 1,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            LastModifiedAt = DateTimeOffset.UtcNow,
            TrackingEvents = new List<TrackingEvent> { trackingEvent },
            ContentItems = new List<ParcelContentItem> { contentItem },
            Watchers = new List<ParcelWatcher> { watcher },
            DeliveryConfirmation = deliveryConfirmation
        };

        await db.Addresses.AddRangeAsync(recipientAddress, shipperAddress);
        await db.Depots.AddAsync(depot);
        await db.Zones.AddAsync(zone);
        await db.Parcels.AddAsync(parcel);
        await db.TrackingEvents.AddAsync(trackingEvent);
        await db.ParcelContentItems.AddAsync(contentItem);
        await db.ParcelWatchers.AddAsync(watcher);
        await db.DeliveryConfirmations.AddAsync(deliveryConfirmation);
        await db.SaveChangesAsync();
    }

    private async Task InsertUniqueStatusParcelAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Delete any leftover data from a previous failed run before inserting fresh data
        var existing = await db.Parcels
            .SingleOrDefaultAsync(p => p.TrackingNumber == "UNIQUE-FILTER-TEST");
        if (existing != null)
        {
            var leftoverRecipientAddrId = existing.RecipientAddressId;
            var leftoverShipperAddrId = existing.ShipperAddressId;
            db.Parcels.Remove(existing);
            await db.SaveChangesAsync();
            var leftoverRecipient = await db.Addresses.FindAsync(leftoverRecipientAddrId);
            if (leftoverRecipient != null) db.Addresses.Remove(leftoverRecipient);
            var leftoverShipper = await db.Addresses.FindAsync(leftoverShipperAddrId);
            if (leftoverShipper != null) db.Addresses.Remove(leftoverShipper);
            await db.SaveChangesAsync();
        }

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "789 Filter Street",
            City = "FilterCity",
            State = "FS",
            PostalCode = "99999",
            CountryCode = "US",
            ContactName = "Filter Recipient",
            IsResidential = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "101 Filter Avenue",
            City = "FilterSenderCity",
            State = "FC",
            PostalCode = "11111",
            CountryCode = "US",
            ContactName = "Filter Sender",
            IsResidential = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "UNIQUE-FILTER-TEST",
            Description = "Parcel for status filter test",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 5,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50,
            Currency = "USD",
            ParcelType = "Light",
            ZoneId = null,
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow,
            TrackingEvents = new List<TrackingEvent>(),
            ContentItems = new List<ParcelContentItem>(),
            Watchers = new List<ParcelWatcher>()
        };

        await db.Addresses.AddRangeAsync(recipientAddress, shipperAddress);
        await db.Parcels.AddAsync(parcel);
        await db.SaveChangesAsync();
    }

    public async ValueTask DisposeAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Clear all parcels created by this test class
        var parcel1 = await db.Parcels.FindAsync(_parcelId);
        if (parcel1 != null) db.Parcels.Remove(parcel1);

        var parcel2 = await db.Parcels.FindAsync(_parcelId2);
        if (parcel2 != null) db.Parcels.Remove(parcel2);

        var zone = await db.Zones.FindAsync(_zoneId);
        if (zone != null) db.Zones.Remove(zone);

        var depot = await db.Depots.FindAsync(_depotId);
        if (depot != null) db.Depots.Remove(depot);

        var addr1 = await db.Addresses.FindAsync(_recipientAddressId);
        if (addr1 != null) db.Addresses.Remove(addr1);

        var addr2 = await db.Addresses.FindAsync(_shipperAddressId);
        if (addr2 != null) db.Addresses.Remove(addr2);

        // Also remove any test parcels that might have been inserted by previous failed runs
        var testParcels = db.Parcels
            .Where(p => p.TrackingNumber.StartsWith("PKG-TEST-"))
            .ToList();
        foreach (var p in testParcels) db.Parcels.Remove(p);

        // Clean up the UNIQUE-FILTER-TEST parcel and its ephemeral addresses
        var filterTestParcel = await db.Parcels
            .SingleOrDefaultAsync(p => p.TrackingNumber == "UNIQUE-FILTER-TEST");
        if (filterTestParcel != null)
        {
            var filterRecipientAddrId = filterTestParcel.RecipientAddressId;
            var filterShipperAddrId = filterTestParcel.ShipperAddressId;
            db.Parcels.Remove(filterTestParcel);
            var filterRecipientAddr = await db.Addresses.FindAsync(filterRecipientAddrId);
            if (filterRecipientAddr != null) db.Addresses.Remove(filterRecipientAddr);
            var filterShipperAddr = await db.Addresses.FindAsync(filterShipperAddrId);
            if (filterShipperAddr != null) db.Addresses.Remove(filterShipperAddr);
        }

        await db.SaveChangesAsync();
    }
}
