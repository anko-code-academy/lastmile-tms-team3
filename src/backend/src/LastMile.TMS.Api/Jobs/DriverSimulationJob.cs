using System.Collections.Concurrent;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.Jobs;

public class DriverSimulationJob
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly IDriverLocationService _locationService;

    // Static because Hangfire creates a new instance each tick.
    // Tracks progress along the route path as a continuous value.
    // Integer part = segment index, fractional part = position within segment.
    private static readonly ConcurrentDictionary<Guid, double> _progress = new();

    // Speed in segments per tick (e.g. 0.25 = 4 ticks per segment, at 5s/tick = 20s per segment)
    private const double Speed = 0.2;

    public DriverSimulationJob(
        IAppDbContextFactory contextFactory,
        IDriverLocationService locationService)
    {
        _contextFactory = contextFactory;
        _locationService = locationService;
    }

    public async Task SimulateAsync(CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();

        var activeRoutes = await context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Depot).ThenInclude(d => d!.Address)
            .Include(r => r.RouteParcels)
                .ThenInclude(rp => rp.Parcel).ThenInclude(p => p.RecipientAddress)
            .Where(r => r.Status == RouteStatus.Dispatched || r.Status == RouteStatus.InProgress)
            .ToListAsync(cancellationToken);

        foreach (var route in activeRoutes)
        {
            var waypoints = BuildWaypoints(route);

            if (waypoints.Count < 2)
                continue;

            var totalSegments = waypoints.Count - 1;

            var progress = _progress.GetValueOrDefault(route.Id, 0.0);

            // Advance
            progress += Speed;

            // Loop back
            if (progress >= totalSegments)
                progress -= totalSegments;

            _progress[route.Id] = progress;

            var (lat, lng) = Interpolate(waypoints, progress);

            await _locationService.UpdatePositionAsync(route.Id, lat, lng, cancellationToken);
        }

        // Clean up routes that are no longer active
        var activeIds = activeRoutes.Select(r => r.Id).ToHashSet();
        foreach (var id in _progress.Keys)
        {
            if (!activeIds.Contains(id))
                _progress.TryRemove(id, out _);
        }
    }

    internal static List<(double Lat, double Lng)> BuildWaypoints(Domain.Entities.DeliveryRoute route)
    {
        var waypoints = new List<(double Lat, double Lng)>();

        // Start at depot
        if (route.Depot?.Address?.GeoLocation != null)
        {
            waypoints.Add((route.Depot.Address.GeoLocation.Y, route.Depot.Address.GeoLocation.X));
        }

        // Stops in order
        var stops = route.RouteParcels
            .Where(rp => rp.Parcel?.RecipientAddress?.GeoLocation != null)
            .OrderBy(rp => rp.StopOrder)
            .Select(rp => (rp.Parcel!.RecipientAddress!.GeoLocation!.Y, rp.Parcel!.RecipientAddress!.GeoLocation!.X))
            .ToList();

        waypoints.AddRange(stops);

        // Return to depot
        if (route.Depot?.Address?.GeoLocation != null && waypoints.Count > 1)
        {
            waypoints.Add((route.Depot.Address.GeoLocation.Y, route.Depot.Address.GeoLocation.X));
        }

        return waypoints;
    }

    internal static (double Lat, double Lng) Interpolate(List<(double Lat, double Lng)> waypoints, double progress)
    {
        var segIdx = (int)progress;
        var frac = progress - segIdx;

        if (segIdx >= waypoints.Count - 1)
        {
            segIdx = waypoints.Count - 2;
            frac = 1.0;
        }

        var from = waypoints[segIdx];
        var to = waypoints[segIdx + 1];

        var lat = from.Lat + (to.Lat - from.Lat) * frac;
        var lng = from.Lng + (to.Lng - from.Lng) * frac;

        return (lat, lng);
    }
}
