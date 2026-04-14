using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using LastMile.TMS.Api.Tests.GraphQL;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Bins;

[Collection("ApiWebApplication")]
public class FindBinByTrackingNumberTests(ApiWebApplicationFactory factory)
{
    [Fact]
    public async Task FindBinByTrackingNumber_Should_Return_Bin_When_Parcel_Is_In_A_Bin()
    {
        var (depotId, _, aisleId, binId, trackingNumber) = await SeedParcelInBinAsync();

        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query ($trackingNumber: String!, $depotId: UUID) {
              binByTrackingNumber(trackingNumber: $trackingNumber, depotId: $depotId) {
                bin {
                  id
                  name
                  code
                  aisleId
                  aisle {
                    id
                    name
                    zone {
                      id
                      name
                      depot {
                        id
                        name
                      }
                    }
                  }
                }
                notFoundReason
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client, query, new { trackingNumber, depotId = (Guid?)depotId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var payload = body.GetProperty("data").GetProperty("binByTrackingNumber");
        payload.GetProperty("notFoundReason").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);

        var bin = payload.GetProperty("bin");
        bin.GetProperty("id").GetGuid().Should().Be(binId);
        bin.GetProperty("aisleId").GetGuid().Should().Be(aisleId);
        bin.GetProperty("aisle").GetProperty("zone").GetProperty("depot").GetProperty("id").GetGuid().Should().Be(depotId);
    }

    [Fact]
    public async Task FindBinByTrackingNumber_Should_Return_NotFound_When_DepotFilter_DoesNotMatch()
    {
        var (_, _, _, _, trackingNumber) = await SeedParcelInBinAsync();
        var wrongDepotId = Guid.NewGuid();

        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query ($trackingNumber: String!, $depotId: UUID) {
              binByTrackingNumber(trackingNumber: $trackingNumber, depotId: $depotId) {
                bin {
                  id
                }
                notFoundReason
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client, query, new { trackingNumber, depotId = (Guid?)wrongDepotId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var payload = body.GetProperty("data").GetProperty("binByTrackingNumber");
        payload.GetProperty("bin").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        payload.GetProperty("notFoundReason").GetString().Should().Be("NOT_FOUND");
    }

    [Fact]
    public async Task FindBinByTrackingNumber_Should_Return_NotInBin_When_Parcel_Has_No_Bin()
    {
        var trackingNumber = await SeedParcelWithoutBinAsync();

        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query ($trackingNumber: String!) {
              binByTrackingNumber(trackingNumber: $trackingNumber) {
                bin {
                  id
                }
                notFoundReason
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client, query, new { trackingNumber }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var payload = body.GetProperty("data").GetProperty("binByTrackingNumber");
        payload.GetProperty("bin").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        payload.GetProperty("notFoundReason").GetString().Should().Be("NOT_IN_BIN");
    }

    [Fact]
    public async Task FindBinByTrackingNumber_Should_Return_NotFound_When_TrackingNumber_DoesNotExist()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query ($trackingNumber: String!) {
              binByTrackingNumber(trackingNumber: $trackingNumber) {
                bin {
                  id
                }
                notFoundReason
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client, query, new { trackingNumber = "NONEXISTENT-999" }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var payload = body.GetProperty("data").GetProperty("binByTrackingNumber");
        payload.GetProperty("bin").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        payload.GetProperty("notFoundReason").GetString().Should().Be("NOT_FOUND");
    }

    [Fact]
    public async Task FindBinByTrackingNumber_Should_Return_Bin_Without_DepotFilter()
    {
        var (_, _, aisleId, binId, trackingNumber) = await SeedParcelInBinAsync();

        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query ($trackingNumber: String!) {
              binByTrackingNumber(trackingNumber: $trackingNumber) {
                bin {
                  id
                  aisleId
                }
                notFoundReason
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(
            client, query, new { trackingNumber }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var payload = body.GetProperty("data").GetProperty("binByTrackingNumber");
        payload.GetProperty("notFoundReason").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);

        var bin = payload.GetProperty("bin");
        bin.GetProperty("id").GetGuid().Should().Be(binId);
        bin.GetProperty("aisleId").GetGuid().Should().Be(aisleId);
    }

    private async Task<(Guid depotId, Guid zoneId, Guid aisleId, Guid binId, string trackingNumber)> SeedParcelInBinAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "900 Search St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = false,
            GeoLocation = new Point(-86.78, 36.16) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = $"Search Depot {Guid.NewGuid():N}"[..20],
            AddressId = address.Id,
            Address = address,
            IsActive = true,
            OperatingHours = new OperatingHours(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var zone = new Zone
        {
            Id = Guid.NewGuid(),
            DepotId = depot.Id,
            Depot = depot,
            Name = "Search Zone",
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var aisle = new Aisle
        {
            Id = Guid.NewGuid(),
            ZoneId = zone.Id,
            Zone = zone,
            Name = "Search Aisle",
            Code = $"SA-{Guid.NewGuid():N}"[..8],
            SortOrder = 1,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var bin = new Bin
        {
            Id = Guid.NewGuid(),
            AisleId = aisle.Id,
            Aisle = aisle,
            Name = "Search Bin",
            Code = "SB-01",
            LabelCode = $"LBL-{Guid.NewGuid():N}"[..16],
            CapacityParcelCount = 20,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var trackingNumber = $"TN-{Guid.NewGuid():N}"[..20];

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = trackingNumber,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Sorted,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            Weight = 1,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 0,
            CurrentStatusChangedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        parcel.AssignToBin(bin);

        await db.Addresses.AddAsync(address);
        await db.Depots.AddAsync(depot);
        await db.Zones.AddAsync(zone);
        await db.Aisles.AddAsync(aisle);
        await db.Bins.AddAsync(bin);
        await db.Parcels.AddAsync(parcel);
        await db.SaveChangesAsync();

        return (depot.Id, zone.Id, aisle.Id, bin.Id, trackingNumber);
    }

    private async Task<string> SeedParcelWithoutBinAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 NoBin Ave",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = false,
            GeoLocation = new Point(-86.78, 36.16) { SRID = 4326 },
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var trackingNumber = $"TN-NOBIN-{Guid.NewGuid():N}"[..20];

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = trackingNumber,
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.ReceivedAtDepot,
            ShipperAddressId = address.Id,
            ShipperAddress = address,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            Weight = 1,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 0,
            CurrentStatusChangedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await db.Addresses.AddAsync(address);
        await db.Parcels.AddAsync(parcel);
        await db.SaveChangesAsync();

        return trackingNumber;
    }
}
