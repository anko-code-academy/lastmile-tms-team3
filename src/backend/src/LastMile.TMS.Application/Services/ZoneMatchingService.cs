using LastMile.TMS.Application.Common.Interfaces;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Services;

public class ZoneMatchingService : IZoneMatchingService
{
    private readonly IAppDbContext _context;
    private readonly GeometryFactory _geometryFactory;

    public ZoneMatchingService(IAppDbContext context)
    {
        _context = context;
        _geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    public Task<Guid?> FindMatchingZoneIdAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var point = _geometryFactory.CreatePoint(new Coordinate(longitude, latitude));
        return FindMatchingZoneIdAsync(point, cancellationToken);
    }

    public async Task<Guid?> FindMatchingZoneIdAsync(Point point, CancellationToken cancellationToken = default)
    {
        // Load all active zones with boundaries and check in memory
        // For production, consider using ST_Contains via raw SQL for better performance
        var zones = await _context.GetZonesAsync(cancellationToken);

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