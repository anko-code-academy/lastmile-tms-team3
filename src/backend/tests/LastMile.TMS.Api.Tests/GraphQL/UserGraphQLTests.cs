using System.Net;
using System.Net.Http.Json;
using FluentAssertions;

namespace LastMile.TMS.Api.Tests.GraphQL;

public class UserGraphQLTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    [Fact]
    public async Task GraphQL_Endpoint_Should_Exist()
    {
        var client = factory.CreateClient();
        var query = new { query = "{ __typename }" };

        var response = await client.PostAsJsonAsync("/graphql", query);

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Users_Query_Should_Require_Authentication()
    {
        var client = factory.CreateClient();
        var query = new { query = "{ users { id } }" };

        var response = await client.PostAsJsonAsync("/graphql", query);
        var content = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        content.Should().ContainAny("errors", "Unauthorized", "401");
    }

    [Fact]
    public async Task CreateUser_Mutation_Should_Require_Authentication()
    {
        var client = factory.CreateClient();
        var mutation = new
        {
            query = """
                mutation {
                    createUser(input: {
                        firstName: "Test"
                        lastName: "User"
                        email: "test@example.com"
                        role: DISPATCHER
                        initialPassword: "Test@12345"
                    }) { id }
                }
                """
        };

        var response = await client.PostAsJsonAsync("/graphql", mutation);
        var content = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
        content.Should().ContainAny("errors", "Unauthorized", "401");
    }
}
