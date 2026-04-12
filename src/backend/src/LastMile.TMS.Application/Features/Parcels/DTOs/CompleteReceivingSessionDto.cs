namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record CompleteReceivingSessionDto(
    Guid SessionId,
    string? ConfirmedBy
);

public record CompleteReceivingSessionResultDto(
    Guid SessionId,
    int ExpectedCount,
    int ReceivedCount,
    int MissingCount,
    List<MissingParcelDto> MissingParcels
);

public record MissingParcelDto(
    string TrackingNumber,
    string Status
);
