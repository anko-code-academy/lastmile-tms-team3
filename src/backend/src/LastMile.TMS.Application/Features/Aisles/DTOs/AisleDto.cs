namespace LastMile.TMS.Application.Features.Aisles.DTOs;

public record AisleDto(
    Guid Id,
    Guid ZoneId,
    string Name,
    string Code,
    int SortOrder,
    bool IsActive,
    string? Notes);