using HotChocolate.Authorization;
using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Vehicles.Commands;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class VehicleMutation
{
    [Authorize(Policy = "OperationsManager")]
    public async Task<VehicleDto> CreateVehicle(
        [Service] IMediator mediator,
        CreateVehicleDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateVehicle.Command(input), cancellationToken);
    }

    [Authorize(Policy = "OperationsManager")]
    public async Task<VehicleDto> UpdateVehicle(
        [Service] IMediator mediator,
        UpdateVehicleDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateVehicle.Command(input), cancellationToken);
    }

    [Authorize(Policy = "OperationsManager")]
    public async Task<VehicleDto> UpdateVehicleStatus(
        [Service] IMediator mediator,
        UpdateVehicleStatusDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateVehicleStatus.Command(input), cancellationToken);
    }

    [Authorize(Policy = "OperationsManager")]
    public async Task<VehicleDto> UpdateVehicleDepot(
        [Service] IMediator mediator,
        UpdateVehicleDepotDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateVehicleDepot.Command(input), cancellationToken);
    }
}
