using HotChocolate.Authorization;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Queries;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class VehicleQuery
{
    [Authorize(Policy = "OperationsManager")]
    public async Task<VehicleDto?> GetVehicle(
        [Service] IMediator mediator,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetVehicleById.Query(id), cancellationToken);
    }

    [Authorize(Policy = "OperationsManager")]
    public async Task<IReadOnlyList<VehicleDto>> GetVehicles(
        [Service] IMediator mediator,
        Guid? depotId = null,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetAllVehicles.Query(depotId), cancellationToken);
    }
}
