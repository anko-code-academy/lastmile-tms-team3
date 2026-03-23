using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Zones.DTOs;

namespace LastMile.TMS.Api.GraphQL.Types;

public class ZoneType : ObjectType<ZoneDto>
{
    protected override void Configure(IObjectTypeDescriptor<ZoneDto> descriptor)
    {
        descriptor.Name("Zone");

        descriptor.Field(d => d.Id).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Boundary).Type<GeoJsonPolygonType>();
        descriptor.Field(d => d.IsActive).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.DepotId).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.DepotName).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(d => d.LastModifiedAt).Type<DateTimeType>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}
