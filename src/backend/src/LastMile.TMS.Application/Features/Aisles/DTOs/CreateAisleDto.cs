namespace LastMile.TMS.Application.Features.Aisles.DTOs;

public record CreateAisleDto(
    Guid ZoneId,
    string Name,
    string Code,
    int SortOrder,
    bool IsActive,
    string? Notes = null);