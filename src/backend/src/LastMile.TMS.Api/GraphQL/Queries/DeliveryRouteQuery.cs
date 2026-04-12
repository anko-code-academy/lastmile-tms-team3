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
public class DeliveryRouteQuery
{
    [Authorize(Policy = "AdminOrDepotOperator")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseFiltering(typeof(DeliveryRouteFilterInput))]
    [UseSorting(typeof(DeliveryRouteSortInput))]
    public IQueryable<DeliveryRoute> GetDeliveryRoutes(AppDbContext context)
        => context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Depot)
                .ThenInclude(d => d!.Address)
            .Include(r => r.Zone)
            .Include(r => r.Driver)
            .Include(r => r.Vehicle)
            .Include(r => r.RouteParcels);
}
