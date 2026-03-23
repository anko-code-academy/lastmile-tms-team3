namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record CreateDepotDto(
    string Name,
    CreateAddressDto Address,
    bool IsActive = true,
    OperatingHoursDto? OperatingHours = null
);
