using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.AuditLogs;

public static class AuditLogQueryExtensions
{
    public static IQueryable<AuditLog> ApplyActorSearch(
        this IQueryable<AuditLog> query,
        string? actor)
    {
        if (string.IsNullOrWhiteSpace(actor))
        {
            return query;
        }

        var trimmedActor = actor.Trim();
        var actorIdPrefixPattern = $"{trimmedActor}%";
        var actorPattern = $"%{trimmedActor}%";

        return query.Where(log =>
            (log.ActorUserId != null && EF.Functions.Like(log.ActorUserId, actorIdPrefixPattern)) ||
            (log.ActorUserName != null && EF.Functions.ILike(log.ActorUserName, actorPattern)));
    }

    public static IQueryable<AuditLog> ApplyAuditFilters(
        this IQueryable<AuditLog> query,
        AuditLogQueryParameters parameters)
    {
        query = query.ApplyActorSearch(parameters.Actor);

        if (parameters.ActionType.HasValue)
            query = query.Where(log => log.ActionType == parameters.ActionType.Value);

        if (parameters.ResourceType.HasValue)
            query = query.Where(log => log.ResourceType == parameters.ResourceType.Value);

        if (!string.IsNullOrWhiteSpace(parameters.ResourceId))
        {
            var resourceId = parameters.ResourceId.Trim();
            query = query.Where(log => log.ResourceId == resourceId);
        }

        if (!string.IsNullOrWhiteSpace(parameters.CorrelationId))
        {
            var correlationId = parameters.CorrelationId.Trim();
            query = query.Where(log => log.CorrelationId == correlationId);
        }

        if (parameters.From.HasValue)
            query = query.Where(log => log.OccurredAt >= parameters.From.Value);

        if (parameters.To.HasValue)
            query = query.Where(log => log.OccurredAt <= parameters.To.Value);

        return query;
    }
}