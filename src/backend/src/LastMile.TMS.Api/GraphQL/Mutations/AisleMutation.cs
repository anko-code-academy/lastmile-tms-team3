using HotChocolate.Authorization;
using HotChocolate.Types;
using LastMile.TMS.Application.Features.Aisles.Commands;
using LastMile.TMS.Application.Features.Aisles.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class AisleMutation
{
    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<AisleDto> CreateAisle(
        [Service] IMediator mediator,
        CreateAisleDto input,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new CreateAisle.Command(input), cancellationToken);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<AisleDto> UpdateAisle(
        [Service] IMediator mediator,
        UpdateAisleDto input,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new UpdateAisle.Command(input), cancellationToken);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    public async Task<bool> DeleteAisle(
        [Service] IMediator mediator,
        Guid id,
        CancellationToken cancellationToken = default)
        => await mediator.Send(new DeleteAisle.Command(id), cancellationToken);
}