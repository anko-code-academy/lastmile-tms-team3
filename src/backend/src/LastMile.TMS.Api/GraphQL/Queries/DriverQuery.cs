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
public class DriverQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Driver> GetDriver(
        AppDbContext context,
        Guid id)
        => context.Drivers
            .AsNoTracking()
            .Where(d => d.Id == id);

    [Authorize(Policy = "AdminOrOperationsManager")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(DriverFilterInput))]
    [UseSorting(typeof(DriverSortInput))]
    public IQueryable<Driver> GetDrivers(
        AppDbContext context,
        string? search = null)
        => context.Drivers
            .AsNoTracking()
            .ApplySearch(search);
}
