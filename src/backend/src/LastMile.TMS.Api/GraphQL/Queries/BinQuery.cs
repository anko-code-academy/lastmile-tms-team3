using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class BinQuery
{
    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Bin> GetBin(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid id)
        => context.Bins
            .AsNoTracking()
            .ApplyWarehouseDepotScope(currentUser)
            .Where(bin => bin.Id == id);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseProjection]
    public IQueryable<Bin> GetBins(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid? depotId = null,
        Guid? zoneId = null,
        Guid? aisleId = null,
        bool? includeInactive = null)
    {
        var query = context.Bins
            .AsNoTracking()
            .ApplyWarehouseDepotScope(currentUser);

        if (depotId.HasValue)
            query = query.Where(bin => bin.Aisle.Zone.DepotId == depotId.Value);

        if (zoneId.HasValue)
            query = query.Where(bin => bin.Aisle.ZoneId == zoneId.Value);

        if (aisleId.HasValue)
            query = query.Where(bin => bin.AisleId == aisleId.Value);

        if (includeInactive != true)
            query = query.Where(bin =>
                bin.IsActive &&
                bin.Aisle.IsActive &&
                bin.Aisle.Zone.IsActive &&
                bin.Aisle.Zone.Depot.IsActive);

        return query;
    }
}