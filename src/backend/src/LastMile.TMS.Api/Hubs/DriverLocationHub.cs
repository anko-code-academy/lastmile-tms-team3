using Microsoft.AspNetCore.SignalR;

namespace LastMile.TMS.Api.Hubs;

public class DriverLocationHub : Hub
{
    public async Task SubscribeRoutes(string[] routeIds)
    {
        foreach (var id in routeIds)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"route-{id}");
    }

    public async Task UnsubscribeRoutes(string[] routeIds)
    {
        foreach (var id in routeIds)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"route-{id}");
    }
}
