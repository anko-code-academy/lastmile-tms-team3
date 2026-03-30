using HotChocolate.Authorization;
using LastMile.TMS.Application.Features.Drivers.Commands;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class DriverMutation
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DriverDto> CreateDriver(
        [Service] IMediator mediator,
        CreateDriverDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateDriver.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DriverDto> UpdateDriver(
        [Service] IMediator mediator,
        UpdateDriverDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateDriver.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DriverDto> UpdateDriverStatus(
        [Service] IMediator mediator,
        UpdateDriverStatusDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateDriverStatus.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DriverDto> UpdateDriverAvailability(
        [Service] IMediator mediator,
        UpdateDriverAvailabilityDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateDriverAvailability.Command(input), cancellationToken);
    }
}
