namespace LastMile.TMS.Application.Features.Aisles.DTOs;

public record UpdateAisleDto(
    Guid Id,
    string Name,
    string Code,
    int SortOrder,
    bool IsActive,
    string? Notes = null);