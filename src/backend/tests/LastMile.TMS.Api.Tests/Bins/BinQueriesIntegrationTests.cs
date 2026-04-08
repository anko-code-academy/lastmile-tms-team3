using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using LastMile.TMS.Api.Tests.GraphQL;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Bins;

[Collection("ApiWebApplication")]
public class BinQueriesIntegrationTests(ApiWebApplicationFactory factory)
{
    [Fact]
    public async Task Aisles_Query_Should_Return_Projected_Aisles_And_Bins_For_Authorized_User()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query {
              aisles {
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
                bins {
                  id
                  code
                  labelCode
                  capacityParcelCount
                }
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();
        body.GetProperty("data").GetProperty("aisles").ValueKind
            .Should().Be(System.Text.Json.JsonValueKind.Array);
    }

    [Fact]
    public async Task Aisles_Query_Should_Return_Count_And_Action_Fields_For_Bins_And_Aisles()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
            query {
              aisles {
                id
                currentParcelCount
                canEdit
                canDelete
                canDeactivate
                bins {
                  id
                  currentParcelCount
                  utilizationPercent
                  canEdit
                  canDelete
                  canDeactivate
                }
              }
            }
            """;

        var response = await GraphQLRequestHelper.QueryAsync(client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var aisle = body.GetProperty("data").GetProperty("aisles")[0];
        aisle.TryGetProperty("currentParcelCount", out _).Should().BeTrue();
        aisle.TryGetProperty("canEdit", out _).Should().BeTrue();
        aisle.TryGetProperty("canDelete", out _).Should().BeTrue();
        aisle.TryGetProperty("canDeactivate", out _).Should().BeTrue();

        var bin = aisle.GetProperty("bins")[0];
        bin.TryGetProperty("currentParcelCount", out _).Should().BeTrue();
        bin.TryGetProperty("utilizationPercent", out _).Should().BeTrue();
        bin.TryGetProperty("canEdit", out _).Should().BeTrue();
        bin.TryGetProperty("canDelete", out _).Should().BeTrue();
        bin.TryGetProperty("canDeactivate", out _).Should().BeTrue();
    }

      [Fact]
      public async Task Aisle_Query_Should_Return_Bins_Ordered_By_Code_Within_The_Aisle()
      {
        var aisleId = await InsertAisleWithOutOfOrderBinsAsync();

        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        var query = """
          query ($id: UUID!) {
            aisle(id: $id) {
            id
            bins {
              code
            }
            }
          }
          """;

        var response = await GraphQLRequestHelper.QueryAsync(client, query, new { id = aisleId }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse();

        var codes = body.GetProperty("data")
          .GetProperty("aisle")
          .GetProperty("bins")
          .EnumerateArray()
          .Select(bin => bin.GetProperty("code").GetString())
          .ToArray();

        codes.Should().Equal("A-01", "A-02", "A-10");
      }

      private async Task<Guid> InsertAisleWithOutOfOrderBinsAsync()
      {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var address = new Address
        {
          Id = Guid.NewGuid(),
          Street1 = "500 Warehouse Way",
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
          Id = Guid.NewGuid(),
          Name = $"Bin Order Depot {Guid.NewGuid():N}"[..24],
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
          Name = "Ordering Zone",
          IsActive = true,
          CreatedAt = DateTimeOffset.UtcNow,
        };

        var aisle = new Aisle
        {
          Id = Guid.NewGuid(),
          ZoneId = zone.Id,
          Zone = zone,
          Name = "Ordering Aisle",
          Code = $"OA-{Guid.NewGuid():N}"[..10],
          SortOrder = 999,
          IsActive = true,
          CreatedAt = DateTimeOffset.UtcNow,
        };

        var bins = new[]
        {
          new Bin
          {
            Id = Guid.NewGuid(),
            AisleId = aisle.Id,
            Aisle = aisle,
            Name = "Bin A-10",
            Code = "A-10",
            LabelCode = $"LBL-{Guid.NewGuid():N}"[..16],
            CapacityParcelCount = 20,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
          },
          new Bin
          {
            Id = Guid.NewGuid(),
            AisleId = aisle.Id,
            Aisle = aisle,
            Name = "Bin A-02",
            Code = "A-02",
            LabelCode = $"LBL-{Guid.NewGuid():N}"[..16],
            CapacityParcelCount = 20,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
          },
          new Bin
          {
            Id = Guid.NewGuid(),
            AisleId = aisle.Id,
            Aisle = aisle,
            Name = "Bin A-01",
            Code = "A-01",
            LabelCode = $"LBL-{Guid.NewGuid():N}"[..16],
            CapacityParcelCount = 20,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
          },
        };

        await db.Addresses.AddAsync(address);
        await db.Depots.AddAsync(depot);
        await db.Zones.AddAsync(zone);
        await db.Aisles.AddAsync(aisle);
        await db.Bins.AddRangeAsync(bins);
        await db.SaveChangesAsync();

        return aisle.Id;
      }
}