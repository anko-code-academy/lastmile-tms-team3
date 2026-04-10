using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.DataLoaders;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class DepotType : ObjectType<Depot>
{
    protected override void Configure(IObjectTypeDescriptor<Depot> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Name);
        descriptor.Field(x => x.Address);
        descriptor.Field(x => x.IsActive);
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
        descriptor.Field(x => x.OperatingHours).Type<OperatingHoursType>();
        descriptor.Field(x => x.Vehicles).Type<NonNullType<ListType<NonNullType<VehicleType>>>>();
        descriptor.Field(x => x.Zones).Type<NonNullType<ListType<NonNullType<ZoneType>>>>();
        descriptor.Field("parcelDashboard")
            .Argument("agingThresholdHours", argument => argument.Type<NonNullType<IntType>>())
            .Type<NonNullType<DepotParcelDashboardType>>()
            .Resolve(async context =>
            {
                var depot = context.Parent<Depot>();
                var agingThresholdHours = context.ArgumentValue<int>("agingThresholdHours");
                var loader = context.DataLoader<DepotParcelDashboardDataLoader>();

                return await loader.LoadAsync(
                    new DepotParcelDashboardKey(depot.Id, agingThresholdHours),
                    context.RequestAborted);
            });
    }
}
