namespace LastMile.TMS.Application.Features.Drivers.DTOs;

public record CreateDriverDto(
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
