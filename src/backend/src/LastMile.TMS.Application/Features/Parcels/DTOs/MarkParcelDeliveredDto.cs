namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record MarkParcelDeliveredDto(
    Guid ParcelId,
    string ReceivedBy,
    string? DeliveryLocation,
    string? SignatureImage,
    string? Photo,
    double? Latitude,
    double? Longitude,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode
);
