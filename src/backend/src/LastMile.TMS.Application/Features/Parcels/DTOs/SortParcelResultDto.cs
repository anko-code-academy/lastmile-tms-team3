using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record SortParcelResultDto(
    Guid ParcelId,
    string TrackingNumber,
    ParcelStatus Status,
    Guid? ZoneId,
    string? ZoneName,
    bool IsMissort,
    bool IsUnsortable,
    IReadOnlyList<TrackingEventDto> TrackingEvents
);
