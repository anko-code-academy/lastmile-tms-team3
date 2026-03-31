namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelWatcherDto(
    Guid Id,
    string Email,
    string? Name
);
