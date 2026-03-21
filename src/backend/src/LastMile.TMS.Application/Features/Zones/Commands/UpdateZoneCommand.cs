using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Features.Zones.Commands;

public static class UpdateZone
{
    public record Command(UpdateZoneDto Dto) : IRequest<ZoneDto>;

    public class Handler : IRequestHandler<Command, ZoneDto>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly GeometryFactory _geometryFactory;

        public Handler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
            _geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        }

        public async Task<ZoneDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var zone = await _context.Zones
                .Include(z => z.Depot)
                .FirstOrDefaultAsync(z => z.Id == request.Dto.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Zone with ID {request.Dto.Id} not found");

            var depot = await _context.Depots
                .FirstOrDefaultAsync(d => d.Id == request.Dto.DepotId, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Dto.DepotId} not found");

            zone.Name = request.Dto.Name;
            zone.DepotId = request.Dto.DepotId;
            zone.IsActive = request.Dto.IsActive;
            zone.LastModifiedAt = DateTimeOffset.UtcNow;
            zone.LastModifiedBy = _currentUser.UserId;

            if (request.Dto.Boundary is not null && request.Dto.Boundary.Coordinates.Count > 0)
            {
                var coordinates = request.Dto.Boundary.Coordinates
                    .Select(c => new Coordinate(c.Longitude, c.Latitude))
                    .ToArray();

                if (coordinates.Length >= 4)
                {
                    zone.Boundary = _geometryFactory.CreatePolygon(coordinates);
                }
            }
            else
            {
                zone.Boundary = null;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(zone, depot.Name);
        }

        private ZoneDto MapToDto(Domain.Entities.Zone zone, string depotName)
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
                depotName,
                zone.CreatedAt,
                zone.LastModifiedAt
            );
        }
    }
}