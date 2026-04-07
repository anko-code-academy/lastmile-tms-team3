using HotChocolate.Authorization;
using HotChocolate.Types.Relay;
using HotChocolate.Authorization;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class ParcelMutation
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<ParcelDto> CreateParcel(
        [Service] IMediator mediator,
        CreateParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateParcel.Command(input), cancellationToken);
    }

    [Authorize(Policy = "Authenticated")]
    public async Task<ParcelDto> TransitionParcelStatus(
        [Service] IMediator mediator,
        TransitionParcelStatusDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new TransitionParcelStatus.Command(input), cancellationToken);
    }

    [Authorize(Policy = "Authenticated")]
    public async Task<ParcelDto> MarkParcelDelivered(
        [Service] IMediator mediator,
        MarkParcelDeliveredDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new MarkParcelDelivered.Command(input), cancellationToken);
    }

    [Authorize(Policy = "Authenticated")]
    public async Task<SortParcelResultDto> SortParcel(
        [Service] IMediator mediator,
        SortParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new SortParcel.Command(input), cancellationToken);
    }
}
