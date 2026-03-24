using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Zones.Queries;

public static class GetZoneById
{
    public record Query(Guid Id) : IRequest<ZoneDto>;

    public class Handler : IRequestHandler<Query, ZoneDto>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<ZoneDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var zone = await _context.Zones
                .Include(z => z.Depot)
                .FirstOrDefaultAsync(z => z.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Zone with ID {request.Id} not found");

            return MapToDto(zone);
        }

        private static ZoneDto MapToDto(Domain.Entities.Zone zone)
        {
            GeoJsonPolygonDto? boundaryDto = null;
            if (zone.Boundary is { } polygon && polygon.Coordinates.Length > 0)
            {
                boundaryDto = new GeoJsonPolygonDto(
                    polygon.Coordinates.Select(c => new GeoJsonPointDto(c.X, c.Y)).ToList()
                );
            }

            return new ZoneDto(
                zone.Id,
                zone.Name,
                boundaryDto,
                zone.IsActive,
                zone.DepotId,
                zone.Depot?.Name ?? "Unknown",
                zone.CreatedAt,
                zone.LastModifiedAt
            );
        }
    }
}