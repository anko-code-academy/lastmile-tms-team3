namespace LastMile.TMS.Application.Features.Vehicles.DTOs;

public record VehicleDepotAddressDto(
    Guid Id,
    string Street1,
    string? Street2,
    string City,
    string State,
    string PostalCode,
    string CountryCode,
    bool IsResidential,
    string? ContactName,
    string? CompanyName,
    string? Phone,
    string? Email,
    double? Latitude,
    double? Longitude
);