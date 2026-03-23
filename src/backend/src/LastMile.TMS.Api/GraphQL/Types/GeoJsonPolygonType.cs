using LastMile.TMS.Application.Features.Zones.DTOs;

namespace LastMile.TMS.Api.GraphQL.Types;

public class GeoJsonPolygonType : ObjectType<GeoJsonPolygonDto>
{
    protected override void Configure(IObjectTypeDescriptor<GeoJsonPolygonDto> descriptor)
    {
        descriptor.Name("GeoJsonPolygon");

        descriptor.Field(d => d.Coordinates)
            .Type<NonNullType<ListType<NonNullType<GeoJsonPointType>>>>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}

public class GeoJsonPointType : ObjectType<GeoJsonPointDto>
{
    protected override void Configure(IObjectTypeDescriptor<GeoJsonPointDto> descriptor)
    {
        descriptor.Name("GeoJsonPoint");

        descriptor.Field(d => d.Longitude).Type<NonNullType<FloatType>>();
        descriptor.Field(d => d.Latitude).Type<NonNullType<FloatType>>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}
