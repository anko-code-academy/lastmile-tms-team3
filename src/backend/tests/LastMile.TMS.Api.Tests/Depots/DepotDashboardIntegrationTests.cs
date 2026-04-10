using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Depots;

public class DepotDashboardIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _otherDepotId = Guid.NewGuid();
    private readonly Guid _depotAddressId = Guid.NewGuid();
    private readonly Guid _otherDepotAddressId = Guid.NewGuid();
    private readonly Guid _zoneNorthId = Guid.NewGuid();
    private readonly Guid _zoneSouthId = Guid.NewGuid();
    private readonly Guid _otherZoneId = Guid.NewGuid();

    [Fact]
    public async Task Depot_Query_Returns_ParcelDashboard_Aggregates_For_Selected_Depot()
    {
        await InsertDashboardDataAsync();
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);

        var query = @"
            query GetDepotDashboard($id: UUID!, $agingThresholdHours: Int!) {
                depot(id: $id) {
                    id
                    name
                    parcelDashboard(agingThresholdHours: $agingThresholdHours) {
                        statusCounts {
                            status
                            count
                        }
                        zoneBreakdown {
                            zoneId
                            zoneName
                            count
                            statusCounts {
                                status
                                count
                            }
                        }
                        agingAlerts {
                            totalCount
                        }
                    }
                }
            }";

        var response = await GraphQLRequestHelper.QueryAsync(
            _client,
            query,
            new { id = _depotId, agingThresholdHours = 24 },
            token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var dashboard = body.GetProperty("data")
            .GetProperty("depot")
            .GetProperty("parcelDashboard");

        var statusCounts = dashboard.GetProperty("statusCounts").EnumerateArray().ToList();
        statusCounts.Should().ContainSingle(item =>
            item.GetProperty("status").GetString() == "RECEIVED_AT_DEPOT" &&
            item.GetProperty("count").GetInt32() == 2);
        statusCounts.Should().ContainSingle(item =>
            item.GetProperty("status").GetString() == "SORTED" &&
            item.GetProperty("count").GetInt32() == 1);
        statusCounts.Should().ContainSingle(item =>
            item.GetProperty("status").GetString() == "EXCEPTION" &&
            item.GetProperty("count").GetInt32() == 1);

        var zoneBreakdown = dashboard.GetProperty("zoneBreakdown").EnumerateArray().ToList();
        zoneBreakdown.Should().ContainSingle(item =>
            item.GetProperty("zoneId").GetString() == _zoneNorthId.ToString() &&
            item.GetProperty("zoneName").GetString() == "North" &&
            item.GetProperty("count").GetInt32() == 3);
        zoneBreakdown.Should().ContainSingle(item =>
            item.GetProperty("zoneId").GetString() == _zoneSouthId.ToString() &&
            item.GetProperty("zoneName").GetString() == "South" &&
            item.GetProperty("count").GetInt32() == 1);

        var northZone = zoneBreakdown.Single(item =>
            item.GetProperty("zoneId").GetString() == _zoneNorthId.ToString());
        var northStatusCounts = northZone.GetProperty("statusCounts").EnumerateArray().ToList();
        northStatusCounts.Should().ContainSingle(item =>
            item.GetProperty("status").GetString() == "RECEIVED_AT_DEPOT" &&
            item.GetProperty("count").GetInt32() == 2);
        northStatusCounts.Should().ContainSingle(item =>
            item.GetProperty("status").GetString() == "SORTED" &&
            item.GetProperty("count").GetInt32() == 1);

        dashboard.GetProperty("agingAlerts").GetProperty("totalCount").GetInt32().Should().Be(2);
    }

    private async Task InsertDashboardDataAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (await db.Depots.FindAsync(_depotId) is not null)
        {
            return;
        }

        var depotAddress = new Address
        {
            Id = _depotAddressId,
            Street1 = "100 Depot Way",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            IsResidential = false,
            GeoLocation = new Point(-90.04898, 35.14953) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var otherDepotAddress = new Address
        {
            Id = _otherDepotAddressId,
            Street1 = "200 Depot Way",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = false,
            GeoLocation = new Point(-86.7816, 36.1627) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Dashboard Depot",
            AddressId = depotAddress.Id,
            Address = depotAddress,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var otherDepot = new Depot
        {
            Id = _otherDepotId,
            Name = "Other Dashboard Depot",
            AddressId = otherDepotAddress.Id,
            Address = otherDepotAddress,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var northZone = new Zone
        {
            Id = _zoneNorthId,
            DepotId = _depotId,
            Name = "North",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var southZone = new Zone
        {
            Id = _zoneSouthId,
            DepotId = _depotId,
            Name = "South",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var otherZone = new Zone
        {
            Id = _otherZoneId,
            DepotId = _otherDepotId,
            Name = "Other",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var parcels = new[]
        {
            CreateParcel(_zoneNorthId, "DBD-RCV-1", ParcelStatus.ReceivedAtDepot, DateTimeOffset.UtcNow.AddHours(-30)),
            CreateParcel(_zoneNorthId, "DBD-RCV-2", ParcelStatus.ReceivedAtDepot, DateTimeOffset.UtcNow.AddHours(-6)),
            CreateParcel(_zoneNorthId, "DBD-SRT-1", ParcelStatus.Sorted, DateTimeOffset.UtcNow.AddHours(-28)),
            CreateParcel(_zoneSouthId, "DBD-EXP-1", ParcelStatus.Exception, DateTimeOffset.UtcNow.AddHours(-2)),
            CreateParcel(_otherZoneId, "DBD-OTH-1", ParcelStatus.ReceivedAtDepot, DateTimeOffset.UtcNow.AddHours(-72)),
        };

        await db.Addresses.AddRangeAsync(depotAddress, otherDepotAddress);
        await db.Depots.AddRangeAsync(depot, otherDepot);
        await db.Zones.AddRangeAsync(northZone, southZone, otherZone);
        await db.Parcels.AddRangeAsync(parcels);
        await db.SaveChangesAsync();
    }

    private static Parcel CreateParcel(
        Guid zoneId,
        string trackingNumber,
        ParcelStatus status,
        DateTimeOffset createdAt)
    {
        var uniqueTrackingNumber = $"{trackingNumber}-{Guid.NewGuid():N}"[..28];

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "10 Recipient Lane",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            ContactName = "Recipient",
            IsResidential = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "20 Shipper Lane",
            City = "Atlanta",
            State = "GA",
            PostalCode = "30303",
            CountryCode = "US",
            ContactName = "Shipper",
            IsResidential = false,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = uniqueTrackingNumber,
            Description = $"Parcel {uniqueTrackingNumber}",
            ServiceType = ServiceType.Standard,
            Status = status,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            Weight = 1.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 20,
            Width = 10,
            Height = 5,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50,
            Currency = "USD",
            ZoneId = zoneId,
            DeliveryAttempts = 0,
            CreatedAt = createdAt,
        };
    }
}