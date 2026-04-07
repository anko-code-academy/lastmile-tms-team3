using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelDto(
    Guid Id,
    string TrackingNumber,
    string BarcodeData,
    string? Description,
    ServiceType ServiceType,
    ParcelStatus Status,
    AddressDto RecipientAddress,
    AddressDto ShipperAddress,
    decimal Weight,
    WeightUnit WeightUnit,
    decimal Length,
    decimal Width,
    decimal Height,
    DimensionUnit DimensionUnit,
    decimal DeclaredValue,
    string Currency,
    DateTimeOffset? EstimatedDeliveryDate,
    DateTimeOffset? ActualDeliveryDate,
    int DeliveryAttempts,
    string? ParcelType,
    string? Notes,
    Guid? ZoneId,
    string? ZoneName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt,
    IReadOnlyList<TrackingEventDto> TrackingEvents,
    IReadOnlyList<ParcelContentItemDto> ContentItems,
    IReadOnlyList<ParcelWatcherDto> Watchers,
    DeliveryConfirmationDto? DeliveryConfirmation
);
