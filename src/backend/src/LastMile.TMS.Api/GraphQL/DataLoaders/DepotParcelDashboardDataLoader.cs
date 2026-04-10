using GreenDonut;
using LastMile.TMS.Api.GraphQL.Types;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.DataLoaders;

public sealed record DepotParcelDashboardKey(Guid DepotId, int AgingThresholdHours);

internal sealed record DepotParcelDashboardParcelRow(
    Guid DepotId,
    Guid ZoneId,
    string ZoneName,
    ParcelStatus Status,
    DateTimeOffset CreatedAt);

public sealed class DepotParcelDashboardDataLoader(
    IDbContextFactory<AppDbContext> dbContextFactory,
    IBatchScheduler batchScheduler,
    DataLoaderOptions? options = null)
    : BatchDataLoader<DepotParcelDashboardKey, DepotParcelDashboard>(batchScheduler, options ?? new DataLoaderOptions())
{
    private static readonly ParcelStatus[] DashboardStatuses =
    [
        ParcelStatus.ReceivedAtDepot,
        ParcelStatus.Sorted,
        ParcelStatus.Staged,
        ParcelStatus.Loaded,
        ParcelStatus.Exception,
    ];

    protected override async Task<IReadOnlyDictionary<DepotParcelDashboardKey, DepotParcelDashboard>> LoadBatchAsync(
        IReadOnlyList<DepotParcelDashboardKey> keys,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var depotIds = keys.Select(key => key.DepotId).Distinct().ToArray();
        var now = DateTimeOffset.UtcNow;

        var depotParcels = await dbContext.Parcels
            .AsNoTracking()
            .Where(parcel =>
                parcel.ZoneId.HasValue &&
                depotIds.Contains(parcel.Zone!.DepotId) &&
                DashboardStatuses.Contains(parcel.Status))
            .Select(parcel => new DepotParcelDashboardParcelRow(
                parcel.Zone!.DepotId,
                parcel.ZoneId!.Value,
                parcel.Zone!.Name,
                parcel.Status,
                parcel.CreatedAt))
            .ToListAsync(cancellationToken);

        return keys.ToDictionary(
            key => key,
            key => BuildDashboard(key, depotParcels, now));
    }

    private static DepotParcelDashboard BuildDashboard(
        DepotParcelDashboardKey key,
        IEnumerable<DepotParcelDashboardParcelRow> depotParcels,
        DateTimeOffset now)
    {
        var parcels = depotParcels
            .Where(parcel => parcel.DepotId == key.DepotId)
            .ToList();

        var statusCounts = DashboardStatuses
            .Select(status => new ParcelStatusCountItem(
                status,
                parcels.Count(parcel => parcel.Status == status)))
            .ToList();

        var zoneBreakdown = parcels
            .GroupBy(parcel => new { parcel.ZoneId, parcel.ZoneName })
            .Select(group => new DepotZoneParcelSummary(
                group.Key.ZoneId,
                group.Key.ZoneName,
                group.Count(),
                DashboardStatuses
                    .Select(status => new ParcelStatusCountItem(
                        status,
                        group.Count(parcel => parcel.Status == status)))
                    .Where(item => item.Count > 0)
                    .ToList()))
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.ZoneName)
            .ToList();

        var threshold = now.AddHours(-Math.Max(1, key.AgingThresholdHours));
        var agingAlerts = new ParcelAgingAlerts(parcels.Count(parcel => parcel.CreatedAt <= threshold));

        return new DepotParcelDashboard(statusCounts, zoneBreakdown, agingAlerts, now);
    }
}