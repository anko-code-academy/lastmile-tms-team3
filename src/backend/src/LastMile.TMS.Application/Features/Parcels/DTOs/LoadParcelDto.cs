using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record LoadParcelDto(
    string TrackingNumber,
    Guid RouteId,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode,
    bool ForceLoad = false
);
