using HotChocolate.Authorization;
using LastMile.TMS.Api.Hubs;
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

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> OptimizeRouteStops(
        [Service] IMediator mediator,
        Guid routeId,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(
            new OptimizeRouteStops.Command(routeId), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> ReorderRouteStops(
        [Service] IMediator mediator,
        ReorderStopsDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(
            new ReorderRouteStops.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> DispatchRoute(
        [Service] IMediator mediator,
        DispatchRouteDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(
            new DispatchRoute.Command(input), cancellationToken);
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> AddParcelsToActiveRoute(
        [Service] IMediator mediator,
        [Service] IRouteNotificationService notifications,
        AddParcelsToRouteDto input,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new AddParcelsToActiveRoute.Command(input), cancellationToken);

        await notifications.NotifyRouteUpdatedAsync(
            result.Id, "ParcelsAdded",
            $"{input.ParcelIds.Count} parcel(s) added to active route",
            cancellationToken);

        return result;
    }

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<RouteDto> RemoveParcelFromActiveRoute(
        [Service] IMediator mediator,
        [Service] IRouteNotificationService notifications,
        RemoveParcelFromRouteDto input,
        CancellationToken cancellationToken = default)
    {
        var result = await mediator.Send(
            new RemoveParcelFromActiveRoute.Command(input), cancellationToken);

        await notifications.NotifyRouteUpdatedAsync(
            result.Id, "ParcelRemoved",
            $"Parcel {input.ParcelId} removed from active route",
            cancellationToken);

        return result;
    }
}
