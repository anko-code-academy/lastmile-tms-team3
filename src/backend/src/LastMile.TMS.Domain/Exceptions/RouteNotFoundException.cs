namespace LastMile.TMS.Domain.Exceptions;

public class RouteNotFoundException : Exception
{
    public Guid RouteId { get; }

    public RouteNotFoundException(Guid routeId)
        : base($"Delivery route '{routeId}' not found")
    {
        RouteId = routeId;
    }
}
