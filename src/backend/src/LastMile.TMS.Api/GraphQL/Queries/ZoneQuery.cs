using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class ZoneQuery
{
    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseSingleOrDefault]
    [UseProjection]
    public IQueryable<Zone> GetZone(
        AppDbContext context,
        Guid id)
        => context.Zones
            .AsNoTracking()
            .Where(z => z.Id == id);

    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseProjection]
    public IQueryable<Zone> GetZones(
        AppDbContext context,
        Guid? depotId = null,
        bool? includeInactive = null)
    {
        var query = context.Zones.AsNoTracking();

        if (depotId.HasValue)
            query = query.Where(z => z.DepotId == depotId.Value);

        if (includeInactive != true)
            query = query.Where(z => z.IsActive);

        return query;
    }
}
