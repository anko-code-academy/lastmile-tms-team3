namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record CreateAddressDto(
    string Street1,
    string? Street2,
    string City,
    string State,
    string PostalCode,
    string CountryCode,
    bool IsResidential = false,
    string? ContactName = null,
    string? CompanyName = null,
    string? Phone = null,
    string? Email = null,
    double? Latitude = null,
    double? Longitude = null
);
