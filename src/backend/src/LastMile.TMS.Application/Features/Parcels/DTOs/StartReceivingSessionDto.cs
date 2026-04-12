namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record StartReceivingSessionDto(
    Guid ManifestId,
    string? DockDoor
);

public record StartReceivingSessionResultDto(
    Guid SessionId,
    Guid ManifestId,
    string? DockDoor
);
