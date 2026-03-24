using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LastMile.TMS.Api.Tests.GraphQL;

public static class GraphQLRequestHelper
{
    public static async Task<HttpResponseMessage> QueryAsync(
        HttpClient client,
        string query,
        object? variables = null,
        string? authorizationToken = null)
    {
        var requestBody = new { query, variables };
        var content = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        client.DefaultRequestHeaders.Authorization =
            string.IsNullOrEmpty(authorizationToken)
                ? null
                : new AuthenticationHeaderValue("Bearer", authorizationToken);

        return await client.PostAsync("/graphql", content);
    }

    public static async Task<string> GetOpsManagerTokenAsync(HttpClient client)
    {
        var formContent = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "password"),
            new KeyValuePair<string, string>("username", "ops@lastmile.local"),
            new KeyValuePair<string, string>("password", "Ops@123456"),
        });

        var response = await client.PostAsync("/connect/token", formContent);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException(
                $"Token endpoint failed with {(int)response.StatusCode}: {errorBody}");
        }

        var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return json.RootElement.GetProperty("access_token").GetString()!;
    }

    public static async Task<JsonElement> ReadGraphQLResponseAsync(HttpResponseMessage response)
    {
        var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
        return json.RootElement;
    }
}
