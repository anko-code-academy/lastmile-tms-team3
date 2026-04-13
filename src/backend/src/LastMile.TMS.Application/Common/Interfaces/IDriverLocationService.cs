namespace LastMile.TMS.Application.Common.Interfaces;

public interface IDriverLocationService
{
    Task UpdatePositionAsync(Guid routeId, double latitude, double longitude, CancellationToken cancellationToken = default);

    (double Latitude, double Longitude)? GetPosition(Guid routeId);
}
