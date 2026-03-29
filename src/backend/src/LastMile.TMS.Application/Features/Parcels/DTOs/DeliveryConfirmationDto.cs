namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record DeliveryConfirmationDto(
    Guid Id,
    string? ReceivedBy,
    string? DeliveryLocation,
    string? SignatureImage,
    string? Photo,
    DateTimeOffset DeliveredAt,
    double? Latitude,
    double? Longitude
);
