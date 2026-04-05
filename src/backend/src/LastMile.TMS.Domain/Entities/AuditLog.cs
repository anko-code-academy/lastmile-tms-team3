using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class AuditLog : BaseEntity
{
    public DateTimeOffset OccurredAt { get; set; }
    public string? ActorUserId { get; set; }
    public string? ActorUserName { get; set; }
    public AuditActionType ActionType { get; set; }
    public AuditResourceType ResourceType { get; set; }
    public string ResourceId { get; set; } = string.Empty;
    public string? CorrelationId { get; set; }
    public string? Summary { get; set; }
    public string? BeforeValuesJson { get; set; }
    public string? AfterValuesJson { get; set; }
}