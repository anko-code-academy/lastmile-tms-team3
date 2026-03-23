namespace LastMile.TMS.Application.Features.Zones.DTOs;

public record CreateZoneDto(
    string Name,
    Guid DepotId,
    GeoJsonPolygonDto? Boundary,
    bool IsActive = true
);
