namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record StageParcelDto(
    string TrackingNumber,
    Guid RouteId,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode,
    bool ForceStage = false
);
