using GreenDonut;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.DataLoaders;

public sealed record AisleWarehouseStats(int CurrentParcelCount, bool HasBins, bool AllBinsEmpty);

public sealed class AisleWarehouseStatsDataLoader(
    IDbContextFactory<AppDbContext> dbContextFactory,
    IBatchScheduler batchScheduler,
    DataLoaderOptions? options = null)
    : BatchDataLoader<Guid, AisleWarehouseStats>(batchScheduler, options ?? new DataLoaderOptions())
{
    protected override async Task<IReadOnlyDictionary<Guid, AisleWarehouseStats>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var binSummaries = await dbContext.Bins
            .Where(bin => keys.Contains(bin.AisleId))
            .Select(bin => new
            {
                bin.AisleId,
                ParcelCount = bin.Parcels.Count()
            })
            .ToListAsync(cancellationToken);

        return keys.ToDictionary(
            key => key,
            key =>
            {
                var bins = binSummaries.Where(item => item.AisleId == key).ToList();
                var hasBins = bins.Count > 0;
                var totalParcelCount = bins.Sum(item => item.ParcelCount);
                var allBinsEmpty = bins.All(item => item.ParcelCount == 0);

                return new AisleWarehouseStats(totalParcelCount, hasBins, allBinsEmpty);
            });
    }
}