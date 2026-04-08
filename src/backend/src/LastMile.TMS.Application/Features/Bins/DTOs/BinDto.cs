namespace LastMile.TMS.Application.Features.Bins.DTOs;

public record BinDto(
    Guid Id,
    Guid AisleId,
    string Name,
    string Code,
    string LabelCode,
    int CapacityParcelCount,
    int CurrentParcelCount,
    decimal UtilizationPercent,
    bool IsActive,
    string? Notes);