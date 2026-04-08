using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Queries;

internal static class WarehouseScopeExtensions
{
    public static IQueryable<Aisle> ApplyWarehouseDepotScope(this IQueryable<Aisle> query, ICurrentUserService currentUser)
    {
        if (!TryGetWarehouseManagerDepotId(currentUser, out var assignedDepotId))
            return currentUser.IsInRole("WarehouseManager") ? query.Where(_ => false) : query;

        return query.Where(aisle => aisle.Zone.DepotId == assignedDepotId);
    }

    public static IQueryable<Bin> ApplyWarehouseDepotScope(this IQueryable<Bin> query, ICurrentUserService currentUser)
    {
        if (!TryGetWarehouseManagerDepotId(currentUser, out var assignedDepotId))
            return currentUser.IsInRole("WarehouseManager") ? query.Where(_ => false) : query;

        return query.Where(bin => bin.Aisle.Zone.DepotId == assignedDepotId);
    }

    private static bool TryGetWarehouseManagerDepotId(ICurrentUserService currentUser, out Guid assignedDepotId)
    {
        assignedDepotId = Guid.Empty;

        if (!currentUser.IsInRole("WarehouseManager"))
            return false;

        if (!currentUser.AssignedDepotId.HasValue)
            return false;

        assignedDepotId = currentUser.AssignedDepotId.Value;
        return true;
    }
}