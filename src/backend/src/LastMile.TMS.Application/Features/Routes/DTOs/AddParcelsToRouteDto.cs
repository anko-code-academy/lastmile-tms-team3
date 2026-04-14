namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record AddParcelsToRouteDto(
    Guid RouteId,
    List<Guid> ParcelIds,
    string? Reason = null
);
