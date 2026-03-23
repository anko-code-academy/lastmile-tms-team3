namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record UpdateDepotDto(
    Guid Id,
    string Name,
    CreateAddressDto Address,
    bool IsActive,
    OperatingHoursDto? OperatingHours
);
