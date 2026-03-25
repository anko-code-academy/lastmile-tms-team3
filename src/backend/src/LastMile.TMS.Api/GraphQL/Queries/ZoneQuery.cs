using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Zones.DTOs;
using LastMile.TMS.Application.Features.Zones.Queries;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class ZoneQuery
{
    public async Task<IReadOnlyList<ZoneDto>> GetZones(
        [Service] IMediator mediator,
        Guid? depotId = null,
        bool? includeInactive = null,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetAllZones.Query(depotId, includeInactive), cancellationToken);
    }

    public async Task<ZoneDto?> GetZone(
        [Service] IMediator mediator,
        [ID] Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetZoneById.Query(id), cancellationToken);
    }
}
