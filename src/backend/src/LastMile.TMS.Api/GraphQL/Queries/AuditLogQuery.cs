using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.AuditLogs;
using LastMile.TMS.Api.GraphQL.Types.Filters;
using LastMile.TMS.Api.GraphQL.Types.Sorting;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class AuditLogQuery
{
    [Authorize(Policy = "Admin")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<AuditLog> GetAuditLog(
        AppDbContext context,
        Guid id)
        => context.AuditLogs
            .AsNoTracking()
            .Where(log => log.Id == id);

    [Authorize(Policy = "Admin")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseFiltering(typeof(AuditLogFilterInput))]
    [UseSorting(typeof(AuditLogSortInput))]
    public IQueryable<AuditLog> GetAuditLogs(
        AppDbContext context,
        string? actor = null)
        => context.AuditLogs
            .AsNoTracking()
            .ApplyActorSearch(actor)
            .OrderByDescending(log => log.OccurredAt);
}