namespace LastMile.TMS.Application.Common.Interfaces;

public record StopLocation(Guid ParcelId, double Latitude, double Longitude);

public record OptimizedRoute(
    Dictionary<Guid, int> OptimizedOrder,
    double TotalDistanceMeters,
    double TotalDurationSeconds);

public interface IRouteOptimizationService
{
    Task<OptimizedRoute> OptimizeAsync(
        StopLocation depot,
        IReadOnlyList<StopLocation> stops,
        CancellationToken cancellationToken = default);
}
