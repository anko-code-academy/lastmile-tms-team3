using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;

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
}