namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record CreateRouteDto(
    DateOnly Date,
    Guid ZoneId,
    Guid? DriverId,
    Guid? VehicleId
);
