using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Api.AuditLogs;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class AuditLogQuery
{
    [Authorize(Policy = "Admin")]
    [UsePaging(IncludeTotalCount = true, MaxPageSize = 100)]
    [UseProjection]
    [UseSorting]
    public IQueryable<AuditLog> GetAuditLogs(
        AppDbContext context,
        string? actor = null,
        AuditActionType? actionType = null,
        AuditResourceType? resourceType = null,
        string? resourceId = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null)
        => context.AuditLogs
            .AsNoTracking()
            .ApplyAuditFilters(new AuditLogQueryParameters(actor, actionType, resourceType, resourceId, from, to))
            .OrderByDescending(log => log.OccurredAt);
}