using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.DataLoaders;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class ParcelType : ObjectType<Parcel>
{
    protected override void Configure(IObjectTypeDescriptor<Parcel> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.TrackingNumber);
        descriptor.Field(x => x.BarcodeData);
        descriptor.Field(x => x.Description);
        descriptor.Field(x => x.ServiceType);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.ShipperAddress).Type<NonNullType<AddressType>>();
        descriptor.Field(x => x.RecipientAddress).Type<NonNullType<AddressType>>();
        descriptor.Field(x => x.Weight);
        descriptor.Field(x => x.WeightUnit);
        descriptor.Field(x => x.Length);
        descriptor.Field(x => x.Width);
        descriptor.Field(x => x.Height);
        descriptor.Field(x => x.DimensionUnit);
        descriptor.Field(x => x.DeclaredValue);
        descriptor.Field(x => x.Currency);
        descriptor.Field(x => x.EstimatedDeliveryDate);
        descriptor.Field(x => x.ActualDeliveryDate);
        descriptor.Field(x => x.DeliveryAttempts);
        descriptor.Field(x => x.ParcelType);
        descriptor.Field(x => x.Notes);
        descriptor.Field(x => x.ZoneId);
        descriptor.Field("zoneName")
            .Type<StringType>()
            .Resolve(ctx => ctx.Parent<Parcel>().Zone?.Name);
        descriptor.Field(x => x.Zone).Type<ZoneType>();
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
        descriptor.Field("contentItemsCount")
            .Type<NonNullType<IntType>>()
            .Resolve(async context =>
            {
                var parcel = context.Parent<Parcel>();
                var loader = context.DataLoader<ParcelContentItemsCountByParcelIdDataLoader>();

                return await loader.LoadAsync(parcel.Id, context.RequestAborted);
            });
        descriptor.Field(x => x.TrackingEvents).Type<NonNullType<ListType<NonNullType<TrackingEventType>>>>();
        descriptor.Field(x => x.ContentItems).Type<NonNullType<ListType<NonNullType<ParcelContentItemType>>>>();
        descriptor.Field(x => x.Watchers).Type<NonNullType<ListType<NonNullType<ParcelWatcherType>>>>();
        descriptor.Field(x => x.DeliveryConfirmation).Type<DeliveryConfirmationType>();
    }
}
