namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ReceiveWalkInParcelDto(
    string TrackingNumber,
    string? DockDoor,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode
);

public record ReceiveWalkInParcelResultDto(
    Guid ParcelId,
    string TrackingNumber,
    string Status,
    bool IsMisdirected
);
