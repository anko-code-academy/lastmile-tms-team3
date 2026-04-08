using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.DataLoaders;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class BinType : ObjectType<Bin>
{
    protected override void Configure(IObjectTypeDescriptor<Bin> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(b => b.Id);
        descriptor.Field(b => b.Name);
        descriptor.Field(b => b.Code);
        descriptor.Field(b => b.LabelCode);
        descriptor.Field(b => b.CapacityParcelCount);
        descriptor.Field(b => b.IsActive);
        descriptor.Field(b => b.Notes);
        descriptor.Field(b => b.AisleId);
        descriptor.Field(b => b.Aisle).Type<AisleType>();
        descriptor.Field(b => b.Parcels).Type<NonNullType<ListType<NonNullType<ParcelType>>>>();
        descriptor.Field("currentParcelCount")
            .Type<NonNullType<IntType>>()
            .Resolve(async context =>
            {
                var bin = context.Parent<Bin>();
                var loader = context.DataLoader<BinParcelCountDataLoader>();

                return await loader.LoadAsync(bin.Id, context.RequestAborted);
            });
        descriptor.Field("utilizationPercent")
            .Type<NonNullType<DecimalType>>()
            .Resolve(async context =>
            {
                var bin = context.Parent<Bin>();
                var loader = context.DataLoader<BinParcelCountDataLoader>();
                var currentParcelCount = await loader.LoadAsync(bin.Id, context.RequestAborted);

                if (bin.CapacityParcelCount <= 0)
                    return 0m;

                return Math.Round(currentParcelCount * 100m / bin.CapacityParcelCount, 2);
            });
        descriptor.Field("canEdit")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var bin = context.Parent<Bin>();
                var loader = context.DataLoader<BinParcelCountDataLoader>();

                return await loader.LoadAsync(bin.Id, context.RequestAborted) == 0;
            });
        descriptor.Field("canDelete")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var bin = context.Parent<Bin>();
                var loader = context.DataLoader<BinParcelCountDataLoader>();

                return await loader.LoadAsync(bin.Id, context.RequestAborted) == 0;
            });
        descriptor.Field("canDeactivate")
            .Type<NonNullType<BooleanType>>()
            .Resolve(async context =>
            {
                var bin = context.Parent<Bin>();
                var loader = context.DataLoader<BinParcelCountDataLoader>();

                return await loader.LoadAsync(bin.Id, context.RequestAborted) == 0;
            });
        descriptor.Field(b => b.CreatedAt);
        descriptor.Field(b => b.LastModifiedAt);
    }
}