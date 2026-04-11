namespace LastMile.TMS.Application.Services;

public class NullImportProgressNotifier : IImportProgressNotifier
{
    public Task NotifyProgressAsync(
        Guid importId,
        int currentRow,
        int totalRows,
        string currentTrackingNumber,
        int parcelsCreated,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task NotifyCompletedAsync(
        Guid importId,
        int totalRows,
        int parcelsCreated,
        CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
