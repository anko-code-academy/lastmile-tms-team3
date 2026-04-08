using GreenDonut;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.DataLoaders;

public sealed class AisleBinsDataLoader(
    IDbContextFactory<AppDbContext> dbContextFactory,
    IBatchScheduler batchScheduler,
    DataLoaderOptions? options = null)
    : BatchDataLoader<Guid, IReadOnlyList<Bin>>(batchScheduler, options ?? new DataLoaderOptions())
{
    protected override async Task<IReadOnlyDictionary<Guid, IReadOnlyList<Bin>>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var bins = await dbContext.Bins
            .AsNoTracking()
            .Where(bin => keys.Contains(bin.AisleId))
            .OrderBy(bin => bin.AisleId)
            .ThenBy(bin => bin.Code)
            .ToListAsync(cancellationToken);

        var groupedBins = bins
            .GroupBy(bin => bin.AisleId)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<Bin>)group.ToList());

        return keys.ToDictionary(
            key => key,
            key => groupedBins.TryGetValue(key, out var aisleBins)
                ? aisleBins
                : Array.Empty<Bin>());
    }
}