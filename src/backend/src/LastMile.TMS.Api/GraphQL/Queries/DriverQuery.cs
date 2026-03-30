using HotChocolate.Authorization;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Queries;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class DriverQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<DriverDto?> GetDriver(
        [Service] IMediator mediator,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetDriverById.Query(id), cancellationToken);
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<PagedDriversResult> GetDrivers(
        [Service] IMediator mediator,
        Guid? depotId = null,
        bool? isActive = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetAllDrivers.Query(depotId, isActive, page, pageSize), cancellationToken);
    }
}
