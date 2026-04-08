namespace LastMile.TMS.Application.Features.Bins.DTOs;

public record UpdateBinDto(
    Guid Id,
    string Name,
    string Code,
    int CapacityParcelCount,
    bool IsActive,
    string? Notes = null);