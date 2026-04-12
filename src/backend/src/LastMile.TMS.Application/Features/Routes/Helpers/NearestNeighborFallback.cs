using LastMile.TMS.Application.Common.Interfaces;

namespace LastMile.TMS.Application.Features.Routes.Helpers;

/// <summary>
/// Greedy nearest-neighbor TSP approximation.
/// Used as a fallback when the Mapbox Optimization API is unavailable.
/// </summary>
public static class NearestNeighborFallback
{
    public static OptimizedRoute Optimize(StopLocation depot, IReadOnlyList<StopLocation> stops)
    {
        if (stops.Count == 0)
        {
            return new OptimizedRoute([], 0, 0);
        }

        var visited = new HashSet<int>();
        var order = new List<(int OriginalIndex, double Distance)>();
        var currentLat = depot.Latitude;
        var currentLon = depot.Longitude;
        var totalDistance = 0.0;

        for (var i = 0; i < stops.Count; i++)
        {
            var nearestIdx = -1;
            var nearestDist = double.MaxValue;

            for (var j = 0; j < stops.Count; j++)
            {
                if (visited.Contains(j)) continue;
                var dist = HaversineDistance(currentLat, currentLon, stops[j].Latitude, stops[j].Longitude);
                if (dist < nearestDist)
                {
                    nearestDist = dist;
                    nearestIdx = j;
                }
            }

            visited.Add(nearestIdx);
            totalDistance += nearestDist;
            order.Add((nearestIdx, nearestDist));
            currentLat = stops[nearestIdx].Latitude;
            currentLon = stops[nearestIdx].Longitude;
        }

        var optimizedOrder = new Dictionary<Guid, int>();
        for (var i = 0; i < order.Count; i++)
        {
            optimizedOrder[stops[order[i].OriginalIndex].ParcelId] = i + 1;
        }

        return new OptimizedRoute(optimizedOrder, totalDistance, totalDistance / 11.0);
    }

    /// <summary>
    /// Haversine distance in meters between two lat/lon points.
    /// </summary>
    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6_371_000; // Earth radius in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double deg) => deg * Math.PI / 180.0;
}
