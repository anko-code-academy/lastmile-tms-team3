using HotChocolate.Authorization;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class RouteMutation
{
    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> CreateRoute(
        [Service] IMediator mediator,
        CreateRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> AddParcelsToRoute(
        [Service] IMediator mediator,
        AddParcelsToRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new AddParcelsToRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> RemoveParcelFromRoute(
        [Service] IMediator mediator,
        RemoveParcelFromRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new RemoveParcelFromRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> AutoAssignParcels(
        [Service] IMediator mediator,
        Guid routeId,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new AutoAssignParcels.Command(routeId), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<bool> DeleteRoute(
        [Service] IMediator mediator,
        Guid routeId,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new DeleteRoute.Command(routeId), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> AssignDriverToRoute(
        [Service] IMediator mediator,
        AssignDriverToRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new AssignDriverToRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> AssignVehicleToRoute(
        [Service] IMediator mediator,
        AssignVehicleToRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new AssignVehicleToRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> UnassignDriverFromRoute(
        [Service] IMediator mediator,
        UnassignFromRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UnassignDriverFromRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> UnassignVehicleFromRoute(
        [Service] IMediator mediator,
        UnassignFromRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UnassignVehicleFromRoute.Command(input), cancellationToken);
    }
}
