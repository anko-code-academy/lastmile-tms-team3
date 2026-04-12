using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record RouteDto(
    Guid Id,
    DateOnly Date,
    Guid ZoneId,
    string? ZoneName,
    Guid? DriverId,
    string? DriverName,
    Guid? VehicleId,
    string? VehiclePlate,
    RouteStatus Status,
    int ParcelCount,
    int EstimatedStops,
    decimal? EstimatedDistance,
    int? EstimatedDuration,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);
