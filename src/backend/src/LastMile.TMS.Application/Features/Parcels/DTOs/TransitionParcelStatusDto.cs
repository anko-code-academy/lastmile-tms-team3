using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record TransitionParcelStatusDto(
    Guid ParcelId,
    ParcelStatus NewStatus,
    string? OperatorName,
    string? LocationCity,
    string? LocationState,
    string? LocationCountryCode
);
