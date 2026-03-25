using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Depots.Commands;
using LastMile.TMS.Application.Features.Depots.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class DepotMutation
{
    public async Task<DepotDto> CreateDepot(
        [Service] IMediator mediator,
        CreateDepotDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateDepot.Command(input), cancellationToken);
    }

    public async Task<DepotDto> UpdateDepot(
        [Service] IMediator mediator,
        UpdateDepotDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateDepot.Command(input), cancellationToken);
    }

    public async Task<bool> DeleteDepot(
        [Service] IMediator mediator,
        [ID] Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new DeleteDepot.Command(id), cancellationToken);
    }
}
