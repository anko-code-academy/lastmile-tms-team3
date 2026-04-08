namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelLabelDto(
    Guid Id,
    string TrackingNumber,
    string BarcodeData,
    string? RecipientName,
    string RecipientAddress,
    string? ZoneName,
    string? ParcelType,
    string ServiceType,
    string PdfBase64
);
