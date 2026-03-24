namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record UpdateVehicleDepotDto(
    Guid Id,
    Guid DepotId
);