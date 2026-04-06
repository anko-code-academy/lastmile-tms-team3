using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class DepotQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Depot> GetDepot(
        AppDbContext context,
        Guid id)
        => context.Depots
            .AsNoTracking()
            .Where(d => d.Id == id);
    
    [Authorize(Policy = "AdminOrOperationsManager")]
    [UseProjection]
    public IQueryable<Depot> GetDepots(
        AppDbContext context,
        bool? includeInactive = null)
        => includeInactive == true
            ? context.Depots.AsNoTracking()
            : context.Depots.AsNoTracking().Where(d => d.IsActive);
}
