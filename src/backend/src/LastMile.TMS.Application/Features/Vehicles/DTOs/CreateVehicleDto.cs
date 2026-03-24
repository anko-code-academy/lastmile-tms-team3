using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record CreateVehicleDto(
    string RegistrationPlate,
    VehicleType Type,
    int ParcelCapacity,
    int WeightCapacity,
    WeightUnit WeightUnit,
    Guid DepotId
);