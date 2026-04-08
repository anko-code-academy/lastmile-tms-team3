using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record StageParcelResultDto(
    Guid ParcelId,
    string TrackingNumber,
    ParcelStatus Status,
    Guid RouteId,
    string RouteName,
    bool IsMisstage,
    // When misstage: the route the parcel was already assigned to
    string? AssignedRouteName
);
