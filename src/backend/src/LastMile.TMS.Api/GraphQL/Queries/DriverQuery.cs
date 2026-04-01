using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class DriverQuery
{
    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseProjection]
    public IQueryable<Driver> GetDriver(
        AppDbContext context,
        Guid id)
        => context.Drivers
            .AsNoTracking()
            .Where(d => d.Id == id);

    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseProjection]
    public IQueryable<Driver> GetDrivers(
        AppDbContext context,
        Guid? depotId = null,
        bool? isActive = null,
        string? search = null)
    {
        var query = context.Drivers.AsNoTracking();

        if (depotId.HasValue)
            query = query.Where(d => d.DepotId == depotId.Value);

        if (isActive.HasValue)
            query = query.Where(d => d.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d =>
                d.FirstName.Contains(search) ||
                d.LastName.Contains(search) ||
                d.Email.Contains(search));

        return query;
    }
}
