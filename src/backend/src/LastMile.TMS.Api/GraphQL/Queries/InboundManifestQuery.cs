using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.GraphQL.Types.Filters;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class InboundManifestQuery
{
    [Authorize(Policy = "AdminOrDepotOperator")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(InboundManifestFilterInput))]
    public IQueryable<InboundManifest> GetInboundManifests(
        AppDbContext context,
        [Service] ICurrentUserService currentUser)
        => context.InboundManifests
            .AsNoTracking()
            .ApplyWarehouseScope(currentUser);
}
