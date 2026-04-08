using Microsoft.AspNetCore.SignalR;

namespace LastMile.TMS.Api.Hubs;

public class ImportProgressHub : Hub
{
    public async Task JoinImport(string importId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"import-{importId}");
    }

    public async Task LeaveImport(string importId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"import-{importId}");
    }
}
