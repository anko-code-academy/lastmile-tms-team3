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
public class ParcelQuery
{
    [Authorize(Policy = "Authenticated")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Parcel> GetParcel(
        AppDbContext context,
        Guid id)
        => context.Parcels
            .AsNoTracking()
            .Where(p => p.Id == id);

    [Authorize(Policy = "Authenticated")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(ParcelFilterInput))]
    [UseSorting(typeof(ParcelSortInput))]
    public IQueryable<Parcel> GetParcels(
        AppDbContext context,
        string? search = null)
        => context.Parcels
            .AsNoTracking()
            .ApplySearch(search);
}
