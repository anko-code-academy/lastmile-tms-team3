namespace LastMile.TMS.Domain.Exceptions;

public class RouteOptimizationException : Exception
{
    public RouteOptimizationException(string message) : base(message) { }
    public RouteOptimizationException(string message, Exception inner) : base(message, inner) { }
}
