using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record AuditLogEntryDto(
    Guid Id,
    DateTimeOffset OccurredAt,
    string? ActorUserName,
    AuditActionType ActionType,
    string? Summary,
    string? BeforeValuesJson,
    string? AfterValuesJson
);
