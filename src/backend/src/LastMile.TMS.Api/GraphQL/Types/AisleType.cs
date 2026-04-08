using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.DataLoaders;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class AisleType : ObjectType<Aisle>
{
    protected override void Configure(IObjectTypeDescriptor<Aisle> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(a => a.Id);
        descriptor.Field(a => a.Name);
        descriptor.Field(a => a.Code);
        descriptor.Field(a => a.SortOrder);
        descriptor.Field(a => a.IsActive);
        descriptor.Field(a => a.Notes);
        descriptor.Field(a => a.ZoneId);
        descriptor.Field(a => a.Zone).Type<ZoneType>();
        descriptor.Field("bins")
            .Type<NonNullType<ListType<NonNullType<BinType>>>>()
            .Resolve(async context =>
            {
                var aisle = context.Parent<Aisle>();
                var loader = context.DataLoader<AisleBinsDataLoader>();
                return await loader.LoadAsync(aisle.Id, context.RequestAborted);
            });
        descriptor.Field("currentParcelCount")
            .Type<NonNullType<IntType>>()
            .Resolve(async context =>
            {
                var aisle = context.Parent<Aisle>();
                var loader = context.DataLoader<AisleWarehouseStatsDataLoader>();
                var stats = await loader.LoadAsync(aisle.Id, context.RequestAborted)
                    ?? new AisleWarehouseStats(0, false, true);

                return stats.CurrentParcelCount;
            });
        descriptor.Field("canEdit")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var aisle = context.Parent<Aisle>();
                var loader = context.DataLoader<AisleWarehouseStatsDataLoader>();
                var stats = await loader.LoadAsync(aisle.Id, context.RequestAborted)
                    ?? new AisleWarehouseStats(0, false, true);

                return !stats.HasBins || stats.AllBinsEmpty;
            });
        descriptor.Field("canDelete")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var aisle = context.Parent<Aisle>();
                var loader = context.DataLoader<AisleWarehouseStatsDataLoader>();
                var stats = await loader.LoadAsync(aisle.Id, context.RequestAborted)
                    ?? new AisleWarehouseStats(0, false, true);

                return !stats.HasBins || stats.AllBinsEmpty;
            });
        descriptor.Field("canDeactivate")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var aisle = context.Parent<Aisle>();
                var loader = context.DataLoader<AisleWarehouseStatsDataLoader>();
                var stats = await loader.LoadAsync(aisle.Id, context.RequestAborted)
                    ?? new AisleWarehouseStats(0, false, true);

                return !stats.HasBins || stats.AllBinsEmpty;
            });
        descriptor.Field(a => a.CreatedAt);
        descriptor.Field(a => a.LastModifiedAt);
    }
}