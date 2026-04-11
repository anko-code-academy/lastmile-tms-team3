namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record SortParcelDto(
    string TrackingNumber,
    Guid? ScannedZoneId,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode
);
