using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Queries;

public static class WarehouseScopeExtensions
{
    public static IQueryable<Aisle> ApplyWarehouseScope(this IQueryable<Aisle> query, ICurrentUserService currentUser)
    {
        if (!TryGetWarehouseManagerDepotId(currentUser, out var assignedDepotId))
            return currentUser.IsInRole("WarehouseManager") ? query.Where(_ => false) : query;

        return query.Where(aisle => aisle.Zone.DepotId == assignedDepotId);
    }

    public static IQueryable<Bin> ApplyWarehouseScope(this IQueryable<Bin> query, ICurrentUserService currentUser)
    {
        if (!TryGetWarehouseManagerDepotId(currentUser, out var assignedDepotId))
            return currentUser.IsInRole("WarehouseManager") ? query.Where(_ => false) : query;

        return query.Where(bin => bin.Aisle.Zone.DepotId == assignedDepotId);
    }

    public static IQueryable<InboundManifest> ApplyWarehouseScope(this IQueryable<InboundManifest> query, ICurrentUserService currentUser)
    {
        if (!TryGetDepotOperatorDepotId(currentUser, out var assignedDepotId))
            return currentUser.IsInRole("DepotOperator") ? query.Where(_ => false) : query;

        return query.Where(manifest => manifest.DepotId == assignedDepotId);
    }

    private static bool TryGetDepotOperatorDepotId(ICurrentUserService currentUser, out Guid assignedDepotId)
    {
        assignedDepotId = Guid.Empty;

        if (!currentUser.IsInRole("DepotOperator"))
            return false;

        if (!currentUser.AssignedDepotId.HasValue)
            return false;

        assignedDepotId = currentUser.AssignedDepotId.Value;
        return true;
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