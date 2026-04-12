using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;

namespace LastMile.TMS.Api.Tests.Drivers;

public class DriverAuthorizationIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetDrivers_AsDispatcher_ReturnsSuccess()
    {
        // Arrange — Dispatcher needs to query drivers when creating delivery routes
        var token = await GraphQLRequestHelper.GetDispatcherTokenAsync(_client);

        var query = @"
            query {
                drivers(first: 5) {
                    nodes {
                        id
                        firstName
                        lastName
                        isActive
                    }
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        // Assert — Dispatcher should be able to list drivers for route creation
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        body.TryGetProperty("errors", out _).Should().BeFalse(
            "Dispatcher role should be authorized to query drivers for route creation");
    }

    [Fact]
    public async Task GetDriver_AsDispatcher_ReturnsSuccess()
    {
        // Arrange
        var token = await GraphQLRequestHelper.GetDispatcherTokenAsync(_client);

        var query = @"
            query GetDriver($id: UUID!) {
                driver(id: $id) {
                    id
                    firstName
                    lastName
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(
            _client, query, new { id = Guid.NewGuid() }, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        // Assert — driver might not exist but should NOT be an auth error
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
        if (body.TryGetProperty("errors", out var errors))
        {
            errors[0].GetProperty("extensions").GetProperty("code").GetString()
                .Should().NotBe("AUTH_NOT_AUTHORIZED",
                    "Dispatcher role should be authorized to query a driver for route creation");
        }
    }
}
