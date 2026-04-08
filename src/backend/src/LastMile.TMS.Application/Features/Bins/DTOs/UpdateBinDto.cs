namespace LastMile.TMS.Application.Features.Bins.DTOs;

public record UpdateBinDto(
    Guid Id,
    string Name,
    bool IsActive,
    string? Notes = null);