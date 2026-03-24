namespace LastMile.TMS.Application.Features.Zones.DTOs;

public record GeoJsonPolygonDto(
    List<GeoJsonPointDto> Coordinates
);
