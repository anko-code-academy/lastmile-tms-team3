using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record VehicleDto(
    Guid Id,
    string RegistrationPlate,
    VehicleType Type,
    VehicleStatus Status,
    int ParcelCapacity,
    int WeightCapacity,
    WeightUnit WeightUnit,
    Guid DepotId,
    VehicleDepotDto? Depot,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);