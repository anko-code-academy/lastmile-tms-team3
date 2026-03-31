using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record TrackingEventDto(
    Guid Id,
    DateTimeOffset Timestamp,
    EventType EventType,
    string Description,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode,
    string? Operator,
    string? DelayReason,
    DateTimeOffset CreatedAt
);
