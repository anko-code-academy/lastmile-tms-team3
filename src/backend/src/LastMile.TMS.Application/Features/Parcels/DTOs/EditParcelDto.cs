using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record EditParcelDto(
    Guid ParcelId,
    string? Description,
    CreateAddressDto RecipientAddress,
    CreateAddressDto ShipperAddress,
    decimal Weight,
    WeightUnit WeightUnit,
    decimal Length,
    decimal Width,
    decimal Height,
    DimensionUnit DimensionUnit,
    decimal DeclaredValue,
    string Currency,
    string? ParcelType,
    string? Notes,
    DateTimeOffset? EstimatedDeliveryDate
);
