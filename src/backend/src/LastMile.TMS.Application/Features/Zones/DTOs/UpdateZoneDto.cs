namespace LastMile.TMS.Application.Features.Zones.DTOs;

public record UpdateZoneDto(
    Guid Id,
    string Name,
    Guid DepotId,
    GeoJsonPolygonDto? Boundary,
    bool IsActive
);
