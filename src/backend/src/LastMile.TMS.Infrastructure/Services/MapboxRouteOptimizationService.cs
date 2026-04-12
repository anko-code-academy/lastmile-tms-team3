using System.Text.Json;
using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Infrastructure.Services;

public class MapboxRouteOptimizationService : IRouteOptimizationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MapboxRouteOptimizationService> _logger;
    private readonly string _accessToken;

    public MapboxRouteOptimizationService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<MapboxRouteOptimizationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _accessToken = configuration["Mapbox:AccessToken"]
            ?? throw new InvalidOperationException("Mapbox:AccessToken is not configured.");
    }

    public async Task<OptimizedRoute> OptimizeAsync(
        StopLocation depot,
        IReadOnlyList<StopLocation> stops,
        CancellationToken cancellationToken = default)
    {
        if (stops.Count == 0)
        {
            return new OptimizedRoute([], 0, 0);
        }

        // Build coordinates string: depot;stop1;stop2;...
        var coordinates = new List<string> { $"{depot.Longitude},{depot.Latitude}" };
        foreach (var stop in stops)
        {
            coordinates.Add($"{stop.Longitude},{stop.Latitude}");
        }
        var coordsString = string.Join(";", coordinates);

        var uri = $"optimized-trips/v1/mapbox/driving/{coordsString}" +
                  $"?access_token={_accessToken}" +
                  "&roundtrip=true" +
                  "&source=first" +
                  "&overview=full";

        var response = await _httpClient.GetAsync(uri, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);

        var code = doc.RootElement.TryGetProperty("code", out var codeEl) ? codeEl.GetString() : null;
        if (code != "Ok")
        {
            throw new InvalidOperationException($"Mapbox Optimization API returned error: {code ?? "unknown"}");
        }

        // Parse waypoints to determine stop order
        var waypoints = doc.RootElement.GetProperty("waypoints");
        var optimizedOrder = new Dictionary<Guid, int>();
        var stopOrder = 1;

        for (var i = 0; i < waypoints.GetArrayLength(); i++)
        {
            var waypoint = waypoints[i];
            var waypointIndex = waypoint.GetProperty("waypoint_index").GetInt32();

            // Index 0 is the depot, skip it
            if (waypointIndex == 0) continue;

            // waypointIndex maps to the input coordinates array
            // Index 0 = depot, indices 1..N = stops
            var inputIndex = waypointIndex - 1;
            if (inputIndex >= 0 && inputIndex < stops.Count)
            {
                optimizedOrder[stops[inputIndex].ParcelId] = stopOrder++;
            }
        }

        // Parse trip distance and duration
        var trips = doc.RootElement.GetProperty("trips");
        if (trips.GetArrayLength() == 0)
            throw new InvalidOperationException("Mapbox Optimization API returned no trips.");

        var trip = trips[0];
        var totalDistance = trip.GetProperty("distance").GetDouble();
        var totalDuration = trip.GetProperty("duration").GetDouble();

        return new OptimizedRoute(optimizedOrder, totalDistance, totalDuration);
    }
}
