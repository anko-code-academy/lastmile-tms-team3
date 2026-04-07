using GreenDonut;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.DataLoaders;

public sealed class ParcelContentItemsCountByParcelIdDataLoader(
    IDbContextFactory<AppDbContext> dbContextFactory,
    IBatchScheduler batchScheduler,
    DataLoaderOptions? options = null)
    : BatchDataLoader<Guid, int>(batchScheduler, options ?? new DataLoaderOptions())
{
    protected override async Task<IReadOnlyDictionary<Guid, int>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var counts = await dbContext.ParcelContentItems
            .Where(item => keys.Contains(item.ParcelId))
            .GroupBy(item => item.ParcelId)
            .Select(group => new { ParcelId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.ParcelId, x => x.Count, cancellationToken);

        return keys.ToDictionary(key => key, key => counts.GetValueOrDefault(key));
    }
}