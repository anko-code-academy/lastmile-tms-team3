namespace LastMile.TMS.Application.Features.Bins.DTOs;

public record CreateBinDto(
    Guid AisleId,
    string Name,
    string Code,
    int CapacityParcelCount,
    bool IsActive,
    string? Notes = null);