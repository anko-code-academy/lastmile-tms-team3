using HotChocolate.Authorization;
using HotChocolate.Types;
using LastMile.TMS.Application.Features.Bins.Commands;
using LastMile.TMS.Application.Features.Bins.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class BinMutation
{
    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<BinDto> CreateBin(
        [Service] IMediator mediator,
        CreateBinDto input,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new CreateBin.Command(input), cancellationToken);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<BinDto> UpdateBin(
        [Service] IMediator mediator,
        UpdateBinDto input,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new UpdateBin.Command(input), cancellationToken);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<bool> DeleteBin(
        [Service] IMediator mediator,
        Guid id,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new DeleteBin.Command(id), cancellationToken);
}