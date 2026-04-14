using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Api.Hubs;

public interface IRouteNotificationService
{
    Task NotifyRouteUpdatedAsync(Guid routeId, string changeType, string description, CancellationToken cancellationToken = default);
}

public class SignalRRouteNotificationService : IRouteNotificationService
{
    private readonly IHubContext<DriverLocationHub> _hubContext;
    private readonly ILogger<SignalRRouteNotificationService> _logger;

    public SignalRRouteNotificationService(
        IHubContext<DriverLocationHub> hubContext,
        ILogger<SignalRRouteNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyRouteUpdatedAsync(Guid routeId, string changeType, string description, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Route {RouteId} updated: {ChangeType} — {Description}", routeId, changeType, description);

        await _hubContext.Clients.Group($"route-{routeId}")
            .SendAsync("RouteUpdated", new
            {
                RouteId = routeId,
                ChangeType = changeType,
                Description = description,
                Timestamp = DateTimeOffset.UtcNow
            }, cancellationToken);
    }
}
