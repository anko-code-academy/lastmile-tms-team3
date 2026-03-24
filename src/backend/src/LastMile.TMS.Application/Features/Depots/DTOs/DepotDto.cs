namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record DepotDto(
    Guid Id,
    string Name,
    AddressDto Address,
    bool IsActive,
    OperatingHoursDto OperatingHours,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);
