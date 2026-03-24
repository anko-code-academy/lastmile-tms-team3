using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record UpdateVehicleDto(
    Guid Id,
    string? RegistrationPlate = null,
    int? ParcelCapacity = null,
    int? WeightCapacity = null,
    VehicleStatus? Status = null,
    Guid? DepotId = null
);