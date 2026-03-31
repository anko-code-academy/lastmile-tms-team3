using LastMile.TMS.Application.Common.Interfaces;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Services;

public class ZoneMatchingService : IZoneMatchingService
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly GeometryFactory _geometryFactory;

    public ZoneMatchingService(IAppDbContextFactory contextFactory)
    {
        _contextFactory = contextFactory;
        _geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    public Task<Guid?> FindMatchingZoneIdAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var point = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        return FindMatchingZoneIdAsync(point, cancellationToken);
    }

    public async Task<Guid?> FindMatchingZoneIdAsync(Point point, CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();

        var zones = await context.GetZonesAsync(cancellationToken);

        foreach (var zone in zones)
        {
            if (zone.Boundary is null)
                continue;

            if (zone.Boundary.Contains(point))
                return zone.Id;
        }

        return null;
    }
}
