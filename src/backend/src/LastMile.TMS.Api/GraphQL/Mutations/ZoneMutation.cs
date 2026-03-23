using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Zones.Commands;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
[Authorize(Roles = "Admin,OperationsManager")]
public class ZoneMutation
{
    public async Task<ZoneDto> CreateZone(
        [Service] IMediator mediator,
        CreateZoneDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateZone.Command(input), cancellationToken);
    }

    public async Task<ZoneDto> UpdateZone(
        [Service] IMediator mediator,
        UpdateZoneDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateZone.Command(input), cancellationToken);
    }

    public async Task<bool> DeleteZone(
        [Service] IMediator mediator,
        [ID] Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new DeleteZone.Command(id), cancellationToken);
    }
}

// GraphQL input type descriptors — map GraphQL inputs to the existing DTOs
public class CreateZoneInput : InputObjectType<CreateZoneDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<CreateZoneDto> descriptor)
    {
        descriptor.Name("CreateZoneInput");
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.DepotId).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Boundary).Type<GeoJsonPolygonInput>();
        descriptor.Field(d => d.IsActive).Type<BooleanType>().DefaultValue(true);
    }
}

public class UpdateZoneInput : InputObjectType<UpdateZoneDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<UpdateZoneDto> descriptor)
    {
        descriptor.Name("UpdateZoneInput");
        descriptor.Field(d => d.Id).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.DepotId).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Boundary).Type<GeoJsonPolygonInput>();
        descriptor.Field(d => d.IsActive).Type<NonNullType<BooleanType>>();
    }
}

public class GeoJsonPolygonInput : InputObjectType<GeoJsonPolygonDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<GeoJsonPolygonDto> descriptor)
    {
        descriptor.Name("GeoJsonPolygonInput");
        descriptor.Field(d => d.Coordinates)
            .Type<NonNullType<ListType<NonNullType<GeoJsonPointInput>>>>();
    }
}

public class GeoJsonPointInput : InputObjectType<GeoJsonPointDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<GeoJsonPointDto> descriptor)
    {
        descriptor.Name("GeoJsonPointInput");
        descriptor.Field(d => d.Longitude).Type<NonNullType<FloatType>>();
        descriptor.Field(d => d.Latitude).Type<NonNullType<FloatType>>();
    }
}
