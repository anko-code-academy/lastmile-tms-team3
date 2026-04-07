using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Features.Parcels.Mappers;

public static class ParcelMapper
{
    public static ParcelDto ToDto(Parcel parcel) => new(
        parcel.Id,
        parcel.TrackingNumber,
        parcel.BarcodeData ?? parcel.TrackingNumber,
        parcel.Description,
        parcel.ServiceType,
        parcel.Status,
        ToAddressDto(parcel.RecipientAddress),
        ToAddressDto(parcel.ShipperAddress),
        parcel.Weight,
        parcel.WeightUnit,
        parcel.Length,
        parcel.Width,
        parcel.Height,
        parcel.DimensionUnit,
        parcel.DeclaredValue,
        parcel.Currency,
        parcel.EstimatedDeliveryDate,
        parcel.ActualDeliveryDate,
        parcel.DeliveryAttempts,
        parcel.ParcelType,
        parcel.Notes,
        parcel.ZoneId,
        parcel.Zone?.Name,
        parcel.CreatedAt,
        parcel.LastModifiedAt,
        TrackingEvents: parcel.TrackingEvents
            .OrderByDescending(e => e.Timestamp)
            .Select(e => new TrackingEventDto(
                e.Id,
                e.Timestamp,
                e.EventType,
                e.Description,
                e.LocationCity,
                e.LocationState,
                e.LocationCountryCode,
                e.Operator,
                e.DelayReason,
                e.CreatedAt))
            .ToList(),
        ContentItems: parcel.ContentItems
            .Select(c => new ParcelContentItemDto(
                c.Id,
                c.HsCode,
                c.Description,
                c.Quantity,
                c.UnitValue,
                c.Currency,
                c.Weight,
                c.WeightUnit,
                c.OriginCountryCode))
            .ToList(),
        Watchers: parcel.Watchers
            .Select(w => new ParcelWatcherDto(w.Id, w.Email, w.Name))
            .ToList(),
        DeliveryConfirmation: parcel.DeliveryConfirmation != null
            ? new DeliveryConfirmationDto(
                parcel.DeliveryConfirmation.Id,
                parcel.DeliveryConfirmation.ReceivedBy,
                parcel.DeliveryConfirmation.DeliveryLocation,
                parcel.DeliveryConfirmation.SignatureImage,
                parcel.DeliveryConfirmation.Photo,
                parcel.DeliveryConfirmation.DeliveredAt,
                parcel.DeliveryConfirmation.DeliveryGeoLocation?.Y,
                parcel.DeliveryConfirmation.DeliveryGeoLocation?.X)
            : null
    );

    private static AddressDto ToAddressDto(Address address) => new(
        address.Street1,
        address.Street2,
        address.City,
        address.State,
        address.PostalCode,
        address.CountryCode,
        address.IsResidential,
        address.ContactName,
        address.CompanyName,
        address.Phone,
        address.Email,
        address.GeoLocation?.Y,
        address.GeoLocation?.X,
        address.GeoLocation?.AsText()
    );
}
