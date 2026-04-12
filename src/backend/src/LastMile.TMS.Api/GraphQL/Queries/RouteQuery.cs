using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.Types.Filters;
using LastMile.TMS.Api.GraphQL.Types.Sorting;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Queries;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class RouteQuery
{
    [Authorize(Policy = "AdminOrDispatcher")]
    [UseFirstOrDefault]
    public IQueryable<DeliveryRoute> GetRoute(
        AppDbContext context,
        Guid id)
        => context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Zone)
            .Include(r => r.Driver)
            .Include(r => r.Vehicle)
            .Include(r => r.RouteParcels)
                .ThenInclude(rp => rp.Parcel)
            .Where(r => r.Id == id);

    [Authorize(Policy = "AdminOrDispatcher")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseFiltering(typeof(DeliveryRouteFilterInput))]
    [UseSorting(typeof(DeliveryRouteSortInput))]
    public IQueryable<DeliveryRoute> GetRoutes(
        AppDbContext context)
        => context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Zone)
            .Include(r => r.Driver)
            .Include(r => r.Vehicle)
            .Include(r => r.RouteParcels);

    [Authorize(Policy = "AdminOrDispatcher")]
    public async Task<IReadOnlyList<AvailableDriverDto>> GetAvailableDrivers(
        [Service] IMediator mediator,
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new GetAvailableDrivers.Query(date), cancellationToken);
    }
}
