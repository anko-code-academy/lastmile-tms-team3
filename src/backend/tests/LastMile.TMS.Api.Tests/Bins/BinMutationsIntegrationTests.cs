using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Api.Tests.Bins;

public class BinMutationsIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    [Fact]
    public async Task CreateAisle_And_CreateDeleteBin_Should_Return_New_Bin_With_Utilization()
    {
        var client = factory.CreateClient();
        var token = await GraphQLRequestHelper.GetAdminTokenAsync(client);

        Guid zoneId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "123 Test St",
                City = "TestCity",
                State = "TS",
                PostalCode = "12345",
                CountryCode = "US",
                GeoLocation = new Point(-73.935242, 40.730610) { SRID = 4326 },
                CreatedAt = DateTimeOffset.UtcNow
            };

            var depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Bin Test Depot",
                AddressId = address.Id,
                Address = address,
                IsActive = true,
                OperatingHours = new OperatingHours(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            var zone = new Zone
            {
                Id = Guid.NewGuid(),
                Name = "Bin Test Zone",
                DepotId = depot.Id,
                Depot = depot,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.Addresses.Add(address);
            db.Depots.Add(depot);
            db.Zones.Add(zone);
            await db.SaveChangesAsync();
            zoneId = zone.Id;
        }

        var createAisleMutation = """
            mutation CreateAisle($input: CreateAisleDtoInput!) {
              createAisle(input: $input) {
                id
                name
                code
                zoneId
              }
            }
            """;

        var aisleResponse = await GraphQLRequestHelper.QueryAsync(
            client,
            createAisleMutation,
            new
            {
                input = new
                {
                    zoneId,
                    name = "Aisle A",
                    code = "A",
                    isActive = true
                }
            },
            token);

        var aisleBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(aisleResponse);

        aisleResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        aisleBody.TryGetProperty("errors", out _).Should().BeFalse();

        var aisleId = Guid.Parse(
            aisleBody.GetProperty("data").GetProperty("createAisle").GetProperty("id").GetString()!);

        var createBinMutation = """
            mutation CreateBin($input: CreateBinDtoInput!) {
              createBin(input: $input) {
                id
                code
                capacityParcelCount
                currentParcelCount
                utilizationPercent
              }
            }
            """;

        var binResponse = await GraphQLRequestHelper.QueryAsync(
            client,
            createBinMutation,
            new
            {
                input = new
                {
                    aisleId,
                    name = "Bin A-01",
                    code = "A-01",
                    capacityParcelCount = 20,
                    isActive = true
                }
            },
            token);

        var binBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(binResponse);

        binResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        binBody.TryGetProperty("errors", out _).Should().BeFalse();
        binBody.GetProperty("data").GetProperty("createBin").GetProperty("currentParcelCount").GetInt32()
            .Should().Be(0);

        var binId = Guid.Parse(
            binBody.GetProperty("data").GetProperty("createBin").GetProperty("id").GetString()!);

        var deleteBinMutation = """
            mutation DeleteBin($id: UUID!) {
              deleteBin(id: $id)
            }
            """;

        var deleteResponse = await GraphQLRequestHelper.QueryAsync(
            client,
            deleteBinMutation,
            new { id = binId },
            token);

        var deleteBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(deleteResponse);

        deleteResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        deleteBody.TryGetProperty("errors", out _).Should().BeFalse();
        deleteBody.GetProperty("data").GetProperty("deleteBin").GetBoolean().Should().BeTrue();

        var deleteAisleMutation = """
            mutation DeleteAisle($id: UUID!) {
              deleteAisle(id: $id)
            }
            """;

        var deleteAisleResponse = await GraphQLRequestHelper.QueryAsync(
            client,
            deleteAisleMutation,
            new { id = aisleId },
            token);

        var deleteAisleBody = await GraphQLRequestHelper.ReadGraphQLResponseAsync(deleteAisleResponse);

        deleteAisleResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        deleteAisleBody.TryGetProperty("errors", out _).Should().BeFalse();
        deleteAisleBody.GetProperty("data").GetProperty("deleteAisle").GetBoolean().Should().BeTrue();
    }
}