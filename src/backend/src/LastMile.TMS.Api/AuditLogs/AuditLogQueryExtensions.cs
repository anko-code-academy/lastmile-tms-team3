using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.AuditLogs;

public static class AuditLogQueryExtensions
{
    public static IQueryable<AuditLog> ApplyAuditFilters(
        this IQueryable<AuditLog> query,
        AuditLogQueryParameters parameters)
    {
        if (!string.IsNullOrWhiteSpace(parameters.Actor))
        {
            var actor = parameters.Actor.Trim();
            var actorIdPrefixPattern = $"{actor}%";
            var actorPattern = $"%{actor}%";

            query = query.Where(log =>
                (log.ActorUserId != null && EF.Functions.Like(log.ActorUserId, actorIdPrefixPattern)) ||
                (log.ActorUserName != null && EF.Functions.ILike(log.ActorUserName, actorPattern)));
        }

        if (parameters.ActionType.HasValue)
            query = query.Where(log => log.ActionType == parameters.ActionType.Value);

        if (parameters.ResourceType.HasValue)
            query = query.Where(log => log.ResourceType == parameters.ResourceType.Value);

        if (!string.IsNullOrWhiteSpace(parameters.ResourceId))
        {
            var resourceId = parameters.ResourceId.Trim();
            query = query.Where(log => log.ResourceId == resourceId);
        }

        if (parameters.From.HasValue)
            query = query.Where(log => log.OccurredAt >= parameters.From.Value);

        if (parameters.To.HasValue)
            query = query.Where(log => log.OccurredAt <= parameters.To.Value);

        return query;
    }
}