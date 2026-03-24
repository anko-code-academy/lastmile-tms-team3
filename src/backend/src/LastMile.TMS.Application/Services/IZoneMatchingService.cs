using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Services;

public interface IZoneMatchingService
{
    Task<Guid?> FindMatchingZoneIdAsync(double latitude, double longitude, CancellationToken cancellationToken = default);
    Task<Guid?> FindMatchingZoneIdAsync(Point point, CancellationToken cancellationToken = default);
}