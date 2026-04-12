using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Features.Routes.Mappers;

public static class RouteMapper
{
    public static RouteDto ToDto(DeliveryRoute route) => new(
        route.Id,
        route.Date,
        route.ZoneId,
        route.Zone?.Name,
        route.DriverId,
        route.Driver?.FullName,
        route.VehicleId,
        route.Vehicle?.RegistrationPlate,
        route.Status,
        route.ParcelCount,
        route.EstimatedStops,
        route.EstimatedDistance,
        route.EstimatedDuration,
        route.CreatedAt,
        route.LastModifiedAt
    );
}
