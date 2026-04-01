using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class VehicleQuery
{
    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseSingleOrDefault]
    [UseProjection]
    public IQueryable<Vehicle> GetVehicle(
        AppDbContext context,
        Guid id)
        => context.Vehicles
            .AsNoTracking()
            .Where(v => v.Id == id);

    // [Authorize(Policy = "AdminOrOperationsManager")]
    [UseProjection]
    public IQueryable<Vehicle> GetVehicles(
        AppDbContext context,
        Guid? depotId = null)
        => depotId.HasValue
            ? context.Vehicles
                .AsNoTracking()
                .Where(v => v.DepotId == depotId.Value)
            : context.Vehicles
                .AsNoTracking();
}
