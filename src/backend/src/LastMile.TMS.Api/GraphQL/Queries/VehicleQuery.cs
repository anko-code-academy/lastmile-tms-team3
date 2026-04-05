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
public class VehicleQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Vehicle> GetVehicle(
        AppDbContext context,
        Guid id)
        => context.Vehicles
            .AsNoTracking()
            .Where(v => v.Id == id);

    [Authorize(Policy = "AdminOrOperationsManager")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(VehicleFilterInput))]
    [UseSorting(typeof(VehicleSortInput))]
    public IQueryable<Vehicle> GetVehicles(
        AppDbContext context,
        string? search = null)
        => context.Vehicles
            .AsNoTracking()
            .ApplySearch(search);
}
