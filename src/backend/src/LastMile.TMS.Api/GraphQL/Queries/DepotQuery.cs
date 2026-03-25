using HotChocolate.Authorization;
using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Depots.Queries;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class DepotQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<IReadOnlyList<DepotDto>> GetDepots(
        [Service] IMediator mediator,
        bool? includeInactive = null,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetAllDepots.Query(includeInactive), cancellationToken);
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DepotDto?> GetDepot(
        [Service] IMediator mediator,
        [ID] Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetDepotById.Query(id), cancellationToken);
    }
}
