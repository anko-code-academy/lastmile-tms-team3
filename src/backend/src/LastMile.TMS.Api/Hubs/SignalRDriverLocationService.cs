using System.Collections.Concurrent;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Api.Hubs;

public record DriverPosition(double Latitude, double Longitude, DateTimeOffset Timestamp);

public class SignalRDriverLocationService : IDriverLocationService
{
    private readonly IHubContext<DriverLocationHub> _hubContext;
    private readonly ILogger<SignalRDriverLocationService> _logger;
    private readonly ConcurrentDictionary<Guid, DriverPosition> _positions = new();

    public SignalRDriverLocationService(
        IHubContext<DriverLocationHub> hubContext,
        ILogger<SignalRDriverLocationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task UpdatePositionAsync(Guid routeId, double latitude, double longitude, CancellationToken cancellationToken = default)
    {
        var position = new DriverPosition(latitude, longitude, DateTimeOffset.UtcNow);
        _positions[routeId] = position;

        await _hubContext.Clients.Group($"route-{routeId}")
            .SendAsync("DriverPositionChanged", new
            {
                RouteId = routeId,
                Latitude = latitude,
                Longitude = longitude,
                Timestamp = position.Timestamp
            }, cancellationToken);
    }

    public (double Latitude, double Longitude)? GetPosition(Guid routeId)
    {
        if (_positions.TryGetValue(routeId, out var pos))
            return (pos.Latitude, pos.Longitude);
        return null;
    }
}
