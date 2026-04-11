using LastMile.TMS.Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace LastMile.TMS.Api.Hubs;

public class SignalRImportProgressNotifier : IImportProgressNotifier
{
    private readonly IHubContext<ImportProgressHub> _hubContext;

    public SignalRImportProgressNotifier(IHubContext<ImportProgressHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyProgressAsync(
        Guid importId,
        int currentRow,
        int totalRows,
        string currentTrackingNumber,
        int parcelsCreated,
        CancellationToken cancellationToken = default)
    {
        var percentComplete = totalRows > 0
            ? (int)Math.Round((double)currentRow / totalRows * 100)
            : 0;

        await _hubContext.Clients.Group($"import-{importId}")
            .SendAsync("ImportProgress", new
            {
                ImportId = importId,
                CurrentRow = currentRow,
                TotalRows = totalRows,
                CurrentTrackingNumber = currentTrackingNumber,
                ParcelsCreated = parcelsCreated,
                PercentComplete = percentComplete
            }, cancellationToken);
    }

    public async Task NotifyCompletedAsync(
        Guid importId,
        int totalRows,
        int parcelsCreated,
        CancellationToken cancellationToken = default)
    {
        await _hubContext.Clients.Group($"import-{importId}")
            .SendAsync("ImportCompleted", new
            {
                ImportId = importId,
                TotalRows = totalRows,
                ParcelsCreated = parcelsCreated
            }, cancellationToken);
    }
}
