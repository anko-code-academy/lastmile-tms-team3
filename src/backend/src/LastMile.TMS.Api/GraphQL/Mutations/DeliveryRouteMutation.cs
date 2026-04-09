using HotChocolate.Authorization;
using HotChocolate.Data;
using LastMile.TMS.Application.Features.DeliveryRoutes.Commands;
using LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class DeliveryRouteMutation
{
    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<CompleteLoadingResultDto> CompleteLoading(
        [Service] IMediator mediator,
        CompleteLoadingDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CompleteLoading.Command(input), cancellationToken);
    }
}
