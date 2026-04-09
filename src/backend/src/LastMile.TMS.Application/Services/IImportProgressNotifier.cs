namespace LastMile.TMS.Application.Services;

public interface IImportProgressNotifier
{
    Task NotifyProgressAsync(
        Guid importId,
        int currentRow,
        int totalRows,
        string currentTrackingNumber,
        int parcelsCreated,
        CancellationToken cancellationToken = default);

    Task NotifyCompletedAsync(
        Guid importId,
        int totalRows,
        int parcelsCreated,
        CancellationToken cancellationToken = default);
}
