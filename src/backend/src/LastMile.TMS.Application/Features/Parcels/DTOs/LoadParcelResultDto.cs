using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record LoadParcelResultDto(
    Guid ParcelId,
    string TrackingNumber,
    ParcelStatus Status,
    bool IsWrongRoute,
    // When wrong route: the route the parcel was already assigned to
    string? AssignedRouteName,
    Guid? AssignedRouteId
);
