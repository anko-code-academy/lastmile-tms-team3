namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record RemoveParcelFromRouteDto(
    Guid RouteId,
    Guid ParcelId,
    string? Reason = null
);
