using LastMile.TMS.Domain.Entities;

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

public record CreateZoneDto(
    string Name,
    Guid DepotId,
    GeoJsonPolygonDto? Boundary,
    bool IsActive = true
);

public record UpdateZoneDto(
    Guid Id,
    string Name,
    Guid DepotId,
    GeoJsonPolygonDto? Boundary,
    bool IsActive
);

public record GeoJsonPolygonDto(
    List<GeoJsonPointDto> Coordinates
);

public record GeoJsonPointDto(
    double Longitude,
    double Latitude
);