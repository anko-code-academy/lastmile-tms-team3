using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class DeliveryRouteType : ObjectType<DeliveryRoute>
{
    protected override void Configure(IObjectTypeDescriptor<DeliveryRoute> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Name);
        descriptor.Field(x => x.DepotId);
        descriptor.Field(x => x.Depot).Type<NonNullType<DepotType>>();
        descriptor.Field(x => x.DriverId);
        descriptor.Field(x => x.Driver).Type<DriverType>();
        descriptor.Field(x => x.ZoneId);
        descriptor.Field(x => x.Zone).Type<ZoneType>();
        descriptor.Field(x => x.Date);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.LoadedAt);
        descriptor.Field(x => x.Parcels).Type<NonNullType<ListType<NonNullType<ParcelType>>>>();
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
    }
}
