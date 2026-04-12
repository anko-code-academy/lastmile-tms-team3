namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ReceiveParcelDto(
    string TrackingNumber,
    Guid SessionId,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode
);

public record ReceiveParcelResultDto(
    Guid ParcelId,
    string TrackingNumber,
    string Status,
    bool IsUnexpected,
    Guid SessionId
);
