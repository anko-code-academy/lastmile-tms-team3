namespace LastMile.TMS.Application.Features.Aisles.DTOs;

public record UpdateAisleDto(
    Guid Id,
    string Name,
    bool IsActive,
    string? Notes = null);