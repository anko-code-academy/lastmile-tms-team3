using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Zones.Queries;

public static class GetAllZones
{
    public record Query(Guid? DepotId = null, bool? IncludeInactive = null) : IRequest<List<ZoneDto>>;

    public class Handler : IRequestHandler<Query, List<ZoneDto>>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ZoneDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            var query = _context.Zones
                .Include(z => z.Depot)
                .AsQueryable();

            if (request.DepotId.HasValue)
            {
                query = query.Where(z => z.DepotId == request.DepotId.Value);
            }

            if (request.IncludeInactive != true)
            {
                query = query.Where(z => z.IsActive);
            }

            var zones = await query.ToListAsync(cancellationToken);

            return zones.Select(z => MapToDto(z)).ToList();
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