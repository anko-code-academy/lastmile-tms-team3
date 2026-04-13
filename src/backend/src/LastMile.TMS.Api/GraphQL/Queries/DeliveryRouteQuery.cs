using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.Types.Filters;
using LastMile.TMS.Api.GraphQL.Types.Sorting;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

public record StagingStatusDto(
    Guid RouteId,
    string RouteName,
    int ExpectedCount,
    int StagedCount
);

[ExtendObjectType(OperationTypeNames.Query)]
public class DeliveryRouteQuery
{
    [Authorize(Policy = "AdminOrDepotOperator")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(DeliveryRouteFilterInput))]
    [UseSorting(typeof(DeliveryRouteSortInput))]
    public IQueryable<DeliveryRoute> GetDeliveryRoutes(AppDbContext context)
        => context.DeliveryRoutes
            .AsNoTracking();

    [Authorize(Policy = "AdminOrDepotOperator")]
    public async Task<StagingStatusDto?> GetStagingStatus(
        AppDbContext context,
        Guid routeId,
        CancellationToken cancellationToken)
    {
        var route = await context.DeliveryRoutes
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == routeId, cancellationToken);

        if (route is null)
            return null;

        // Expected: sorted parcels in this zone not yet assigned to another route,
        // plus parcels already staged to this route. Excludes parcels assigned to a
        // different route in the same zone to avoid inflation when routes share a zone.
        var expectedCount = await context.Parcels
            .Where(p => p.ZoneId == route.ZoneId &&
                        (p.Status == ParcelStatus.Sorted && !p.RouteId.HasValue) ||
                         p.RouteId == routeId)
            .CountAsync(cancellationToken);

        var stagedCount = await context.Parcels
            .Where(p => p.RouteId == routeId && p.Status == ParcelStatus.Staged)
            .CountAsync(cancellationToken);

        return new StagingStatusDto(
            RouteId: route.Id,
            RouteName: route.Name,
            ExpectedCount: expectedCount,
            StagedCount: stagedCount);
    }
}
