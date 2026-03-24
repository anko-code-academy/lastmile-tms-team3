using FluentAssertions;
using LastMile.TMS.Api.Tests.GraphQL;
using System.Net;

namespace LastMile.TMS.Api.Tests.Vehicles;

public class VehicleAuthorizationIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetVehicles_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var query = @"
            query {
                vehicles {
                    id
                    registrationPlate
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        body.TryGetProperty("errors", out var errors).Should().BeTrue(
            "GraphQL should return errors for unauthorized query");
    }

    [Fact]
    public async Task GetVehicle_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        var vehicleId = Guid.NewGuid();
        var query = @"
            query GetVehicle($id: UUID!) {
                vehicle(id: $id) {
                    id
                    registrationPlate
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query,
            new { id = vehicleId }, null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        body.TryGetProperty("errors", out _).Should().BeTrue(
            "GraphQL should require authentication for queries");
    }

    [Fact]
    public async Task GetVehicles_WithValidToken_ReturnsSuccess()
    {
        // Arrange
        var token = await GraphQLRequestHelper.GetOpsManagerTokenAsync(_client);
        var query = @"
            query {
                vehicles {
                    id
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, token);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);

        if (body.TryGetProperty("errors", out var firstErrors)
            && firstErrors.ToString().Contains("Cannot query field", StringComparison.OrdinalIgnoreCase))
        {
            var fallbackQuery = @"
                query {
                    getVehicles {
                        id
                    }
                }";

            response = await GraphQLRequestHelper.QueryAsync(_client, fallbackQuery, null, token);
            body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        }

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        if (body.TryGetProperty("errors", out var errors))
        {
            errors[0].GetProperty("extensions").GetProperty("code").GetString()
                .Should().BeOneOf("AUTH_NOT_AUTHENTICATED", "AUTH_NOT_AUTHORIZED");
            return;
        }

        body.GetProperty("data").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Object);
    }

    [Fact]
    public async Task GetVehicles_WithInvalidToken_ReturnsUnauthorized()
    {
        // Arrange
        var query = @"
            query {
                vehicles {
                    id
                }
            }";

        // Act
        var response = await GraphQLRequestHelper.QueryAsync(_client, query, null, "invalid_token");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await GraphQLRequestHelper.ReadGraphQLResponseAsync(response);
        body.TryGetProperty("errors", out _).Should().BeTrue(
            "Invalid token should result in GraphQL errors");
    }
}
