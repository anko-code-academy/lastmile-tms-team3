using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace LastMile.TMS.Api.Tests.Auth;

public class LoginIntegrationTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Token_Endpoint_Should_Return_Unauthorized_For_Invalid_Credentials()
    {
        var client = factory.CreateClient();

        var formContent = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "password"),
            new KeyValuePair<string, string>("username", "wrong@example.com"),
            new KeyValuePair<string, string>("password", "WrongPassword123!"),
        });

        var response = await client.PostAsync("/connect/token", formContent);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Token_Endpoint_Should_Exist()
    {
        var client = factory.CreateClient();

        var formContent = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "password"),
            new KeyValuePair<string, string>("username", "admin@lastmile.local"),
            new KeyValuePair<string, string>("password", "Admin@123456"),
        });

        var response = await client.PostAsync("/connect/token", formContent);

        // Should not be 404 — endpoint must exist
        response.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
    }
}
