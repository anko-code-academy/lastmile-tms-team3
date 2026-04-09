namespace LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;

public record CompleteLoadingResultDto(
    Guid RouteId,
    bool IsSuccess,
    bool HasUnloadedParcels,
    int UnloadedParcelCount,
    IReadOnlyList<ParcelInfo> UnloadedParcels
);

