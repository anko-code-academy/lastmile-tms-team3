using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class AisleQuery
{
    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Aisle> GetAisle(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid id)
        => context.Aisles
            .AsNoTracking()
            .ApplyWarehouseDepotScope(currentUser)
            .Where(aisle => aisle.Id == id);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseProjection]
    public IQueryable<Aisle> GetAisles(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid? depotId = null,
        Guid? zoneId = null,
        bool? includeInactive = null)
    {
        var query = context.Aisles
            .AsNoTracking()
            .ApplyWarehouseDepotScope(currentUser);

        if (depotId.HasValue)
            query = query.Where(aisle => aisle.Zone.DepotId == depotId.Value);

        if (zoneId.HasValue)
            query = query.Where(aisle => aisle.ZoneId == zoneId.Value);

        if (includeInactive != true)
            query = query.Where(aisle =>
                aisle.IsActive &&
                aisle.Zone.IsActive &&
                aisle.Zone.Depot.IsActive);

        return query;
    }
}