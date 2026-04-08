using GreenDonut;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.DataLoaders;

public sealed class BinParcelCountDataLoader(
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

        var counts = await dbContext.Parcels
            .Where(parcel => parcel.CurrentBinId.HasValue && keys.Contains(parcel.CurrentBinId.Value))
            .GroupBy(parcel => parcel.CurrentBinId!.Value)
            .Select(group => new { BinId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.BinId, item => item.Count, cancellationToken);

        return keys.ToDictionary(key => key, key => counts.GetValueOrDefault(key));
    }
}