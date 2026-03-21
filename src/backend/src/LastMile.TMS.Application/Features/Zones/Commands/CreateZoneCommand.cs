using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Zones.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Features.Zones.Commands;

public static class CreateZone
{
    public record Command(CreateZoneDto Dto) : IRequest<ZoneDto>;

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
            var depot = await _context.Depots
                .FirstOrDefaultAsync(d => d.Id == request.Dto.DepotId, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Dto.DepotId} not found");

            Geometry? boundary = null;
            if (request.Dto.Boundary is not null && request.Dto.Boundary.Coordinates.Count > 0)
            {
                var coordinates = request.Dto.Boundary.Coordinates
                    .Select(c => new Coordinate(c.Longitude, c.Latitude))
                    .ToArray();

                if (coordinates.Length >= 4)
                {
                    boundary = _geometryFactory.CreatePolygon(coordinates);
                }
            }

            var zone = new Domain.Entities.Zone
            {
                Id = Guid.NewGuid(),
                Name = request.Dto.Name,
                DepotId = request.Dto.DepotId,
                Boundary = boundary,
                IsActive = request.Dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = _currentUser.UserId
            };

            _context.Zones.Add(zone);
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