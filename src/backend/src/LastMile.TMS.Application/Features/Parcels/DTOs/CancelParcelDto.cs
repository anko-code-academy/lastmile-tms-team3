namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record CancelParcelDto(
    Guid ParcelId,
    string CancelReason,
    string? OperatorName = null
);
