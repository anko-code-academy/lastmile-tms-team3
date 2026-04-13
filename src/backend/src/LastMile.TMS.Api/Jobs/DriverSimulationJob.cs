using System.Collections.Concurrent;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Api.Jobs;

public class DriverSimulationJob
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly IDriverLocationService _locationService;
    private readonly ILogger<DriverSimulationJob> _logger;
    private readonly ConcurrentDictionary<Guid, int> _stopIndex = new();

    public DriverSimulationJob(
        IAppDbContextFactory contextFactory,
        IDriverLocationService locationService,
        ILogger<DriverSimulationJob> logger)
    {
        _contextFactory = contextFactory;
        _locationService = locationService;
        _logger = logger;
    }

    public async Task SimulateAsync(CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();

        var activeRoutes = await context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.RouteParcels)
                .ThenInclude(rp => rp.Parcel)
                    .ThenInclude(p => p.RecipientAddress)
            .Where(r => r.Status == RouteStatus.Dispatched || r.Status == RouteStatus.InProgress)
            .ToListAsync(cancellationToken);

        foreach (var route in activeRoutes)
        {
            var stops = route.RouteParcels
                .Where(rp => rp.Parcel?.RecipientAddress?.GeoLocation != null)
                .OrderBy(rp => rp.StopOrder)
                .Select(rp => new
                {
                    rp.Parcel.RecipientAddress!.GeoLocation!.X,
                    rp.Parcel.RecipientAddress!.GeoLocation!.Y
                })
                .ToList();

            if (stops.Count == 0) continue;

            var idx = _stopIndex.GetValueOrDefault(route.Id, 0);
            if (idx >= stops.Count)
            {
                // Loop back
                idx = 0;
            }

            var stop = stops[idx];
            await _locationService.UpdatePositionAsync(route.Id, stop.Y, stop.X, cancellationToken);

            _stopIndex[route.Id] = idx + 1;
        }
    }
}
