using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelContentItemDto(
    Guid Id,
    string HsCode,
    string Description,
    int Quantity,
    decimal UnitValue,
    string Currency,
    decimal Weight,
    WeightUnit WeightUnit,
    string OriginCountryCode
);
