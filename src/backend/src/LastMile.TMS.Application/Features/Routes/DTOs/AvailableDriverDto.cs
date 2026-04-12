namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record AvailableDriverDto(
    Guid Id,
    string FullName,
    int RouteCount
);
