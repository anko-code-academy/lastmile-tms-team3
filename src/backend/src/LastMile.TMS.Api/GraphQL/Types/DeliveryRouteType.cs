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
        descriptor.Field("zoneName").Type<StringType>().Resolve(ctx => ctx.Parent<DeliveryRoute>().Zone?.Name);
        descriptor.Field("driverName").Type<StringType>().Resolve(ctx => ctx.Parent<DeliveryRoute>().Driver?.FullName);
        descriptor.Field(x => x.VehicleId);
        descriptor.Field(x => x.Vehicle).Type<VehicleType>();
        descriptor.Field("vehiclePlate").Type<StringType>().Resolve(ctx => ctx.Parent<DeliveryRoute>().Vehicle?.RegistrationPlate);
        descriptor.Field(x => x.Date);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.EstimatedStops);
        descriptor.Field(x => x.EstimatedDistance);
        descriptor.Field(x => x.LoadedAt);
        descriptor.Field("parcelCount").Resolve(ctx => ctx.Parent<DeliveryRoute>().RouteParcels.Count);
        descriptor.Field(x => x.RouteParcels).Type<ListType<RouteParcelType>>();
        descriptor.Field(x => x.Parcels).Type<NonNullType<ListType<NonNullType<ParcelType>>>>();
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
    }
}
