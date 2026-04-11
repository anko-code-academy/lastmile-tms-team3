namespace LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;

public record CompleteLoadingDto(
    Guid RouteId,
    string? OperatorName,
    bool ForceComplete = false
);
