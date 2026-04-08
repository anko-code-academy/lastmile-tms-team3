using HotChocolate.Authorization;
using HotChocolate.Types.Relay;
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

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<SortParcelResultDto> SortParcel(
        [Service] IMediator mediator,
        SortParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new SortParcel.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<LoadParcelResultDto> LoadParcel(
        [Service] IMediator mediator,
        LoadParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new LoadParcel.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<StageParcelResultDto> StageParcel(
        [Service] IMediator mediator,
        StageParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new StageParcel.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<StartReceivingSessionResultDto> StartReceivingSession(
        [Service] IMediator mediator,
        StartReceivingSessionDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new StartReceivingSession.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<ReceiveParcelResultDto> ReceiveParcel(
        [Service] IMediator mediator,
        ReceiveParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new ReceiveParcel.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<CompleteReceivingSessionResultDto> CompleteReceivingSession(
        [Service] IMediator mediator,
        CompleteReceivingSessionDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CompleteReceivingSession.Command(input), cancellationToken);
    }
}
