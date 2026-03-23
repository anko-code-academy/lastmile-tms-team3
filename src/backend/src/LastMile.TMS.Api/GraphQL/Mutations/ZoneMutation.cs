using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Zones.Commands;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
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
