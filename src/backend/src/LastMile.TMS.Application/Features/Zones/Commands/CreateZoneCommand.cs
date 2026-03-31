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
        private readonly IAppDbContextFactory _contextFactory;
        private readonly ICurrentUserService _currentUser;
        private readonly GeometryFactory _geometryFactory;

        public Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        {
            _contextFactory = contextFactory;
            _currentUser = currentUser;
            _geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        }

        public async Task<ZoneDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var depot = await context.Depots
                .FirstOrDefaultAsync(d => d.Id == request.Dto.DepotId, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Dto.DepotId} not found");

            Geometry? boundary = null;
            if (request.Dto.Boundary is not null && request.Dto.Boundary.Coordinates.Count > 0)
            {
                var coordinates = request.Dto.Boundary.Coordinates
                    .Select(c => new Coordinate(c.Longitude, c.Latitude))
                    .ToList();

                if (coordinates.Count >= 4 && !coordinates.First().Equals2D(coordinates.Last()))
                {
                    coordinates.Add(coordinates.First());
                }

                if (coordinates.Count >= 4)
                {
                    boundary = _geometryFactory.CreatePolygon(coordinates.ToArray());
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

            context.Zones.Add(zone);
            await context.SaveChangesAsync(cancellationToken);

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
