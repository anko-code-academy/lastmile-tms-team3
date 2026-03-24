using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record UpdateVehicleStatusDto(
    Guid Id,
    VehicleStatus Status
);