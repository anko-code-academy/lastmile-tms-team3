namespace LastMile.TMS.Application.Features.Drivers.DTOs;

public record AvailableDriverDto(
    Guid Id,
    string FullName,
    int RouteCount
);
