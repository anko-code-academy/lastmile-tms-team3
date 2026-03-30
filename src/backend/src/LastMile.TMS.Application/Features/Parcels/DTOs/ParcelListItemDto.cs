using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelListItemDto(
    Guid Id,
    string TrackingNumber,
    string? Description,
    ServiceType ServiceType,
    ParcelStatus Status,
    string RecipientName,
    string RecipientCity,
    string? ZoneName,
    string? ParcelType,
    decimal Weight,
    WeightUnit WeightUnit,
    decimal DeclaredValue,
    string Currency,
    DateTimeOffset? EstimatedDeliveryDate,
    int ContentItemsCount,
    DateTimeOffset CreatedAt
);
