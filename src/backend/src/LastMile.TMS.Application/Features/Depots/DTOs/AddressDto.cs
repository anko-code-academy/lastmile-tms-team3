namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record AddressDto(
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
    double? Longitude,
    string? GeoLocation
);
