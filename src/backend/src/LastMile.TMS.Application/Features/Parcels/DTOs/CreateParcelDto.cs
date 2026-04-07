using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record CreateParcelDto(
    string? Description,
    ServiceType ServiceType,
    CreateAddressDto RecipientAddress,
    CreateAddressDto ShipperAddress,
    decimal Weight,
    WeightUnit WeightUnit,
    decimal Length,
    decimal Width,
    decimal Height,
    DimensionUnit DimensionUnit,
    decimal DeclaredValue,
    string Currency = "USD",
    string? ParcelType = null,
    string? Notes = null
);
