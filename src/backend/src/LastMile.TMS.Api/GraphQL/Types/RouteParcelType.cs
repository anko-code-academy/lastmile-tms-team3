using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class RouteParcelType : ObjectType<RouteParcel>
{
    protected override void Configure(IObjectTypeDescriptor<RouteParcel> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.RouteId);
        descriptor.Field(x => x.ParcelId);
        descriptor.Field(x => x.Parcel).Type<ParcelType>();
        descriptor.Field(x => x.StopOrder);
        descriptor.Field(x => x.AddedAt);
    }
}
