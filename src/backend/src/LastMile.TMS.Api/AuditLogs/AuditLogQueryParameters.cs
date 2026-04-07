using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Api.AuditLogs;

public sealed record AuditLogQueryParameters(
    string? Actor = null,
    AuditActionType? ActionType = null,
    AuditResourceType? ResourceType = null,
    string? ResourceId = null,
    string? CorrelationId = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null);