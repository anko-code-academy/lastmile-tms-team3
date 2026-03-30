using HotChocolate.Authorization;
using LastMile.TMS.Application.Common.DTOs;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Queries;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class ParcelQuery
{
    [Authorize(Policy = "Authenticated")]
    public async Task<PagedResultDto<ParcelListItemDto>> SearchParcels(
        [Service] IMediator mediator,
        SearchParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new SearchParcels.Query(input), cancellationToken);
    }

    [Authorize(Policy = "Authenticated")]
    public async Task<ParcelDto?> GetParcel(
        [Service] IMediator mediator,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetParcelById.Query(id), cancellationToken);
    }
}
