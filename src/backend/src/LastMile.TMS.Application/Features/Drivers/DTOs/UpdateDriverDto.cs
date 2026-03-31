namespace LastMile.TMS.Application.Features.Drivers.DTOs;

public record UpdateDriverDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Phone,
    string Email,
    string LicenseNumber,
    DateOnly LicenseExpiryDate,
    string? PhotoUrl,
    Guid? ZoneId,
    Guid? DepotId
);
