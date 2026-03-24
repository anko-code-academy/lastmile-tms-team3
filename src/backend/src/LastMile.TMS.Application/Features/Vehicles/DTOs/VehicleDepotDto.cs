namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record VehicleDepotDto(
    Guid Id,
    string Name,
    VehicleDepotAddressDto? Address,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);