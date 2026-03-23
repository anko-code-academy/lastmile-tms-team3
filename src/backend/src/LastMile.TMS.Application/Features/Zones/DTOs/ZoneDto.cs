namespace LastMile.TMS.Application.Features.Zones.DTOs;

public record ZoneDto(
    Guid Id,
    string Name,
    GeoJsonPolygonDto? Boundary,
    bool IsActive,
    Guid DepotId,
    string DepotName,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);
