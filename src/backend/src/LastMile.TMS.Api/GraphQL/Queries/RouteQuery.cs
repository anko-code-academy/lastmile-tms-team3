using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.Types.Filters;
using LastMile.TMS.Api.GraphQL.Types.Sorting;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
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
    [UseProjection]
    [UseFiltering(typeof(RouteFilterInput))]
    [UseSorting(typeof(RouteSortInput))]
    public IQueryable<DeliveryRoute> GetRoutes(
        AppDbContext context,
        string? search = null)
        => context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Zone)
            .Include(r => r.Driver)
            .Include(r => r.Vehicle);
}
