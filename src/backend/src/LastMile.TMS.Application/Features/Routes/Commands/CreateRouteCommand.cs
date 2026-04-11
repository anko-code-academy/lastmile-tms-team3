using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class CreateRoute
{
    public record Command(CreateRouteDto Dto) : IRequest<RouteDto>;

    public class Handler : IRequestHandler<Command, RouteDto>
    {
        private readonly IAppDbContextFactory _contextFactory;
        private readonly ICurrentUserService _currentUser;

        public Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        {
            _contextFactory = contextFactory;
            _currentUser = currentUser;
        }

        public async Task<RouteDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var zone = await context.Zones.FirstOrDefaultAsync(z => z.Id == request.Dto.ZoneId, cancellationToken)
                ?? throw new InvalidOperationException($"Zone with ID '{request.Dto.ZoneId}' was not found.");

            Driver? driver = null;
            if (request.Dto.DriverId.HasValue)
            {
                driver = await context.Drivers.FirstOrDefaultAsync(d => d.Id == request.Dto.DriverId.Value, cancellationToken)
                    ?? throw new InvalidOperationException($"Driver with ID '{request.Dto.DriverId}' was not found.");
            }

            Vehicle? vehicle = null;
            if (request.Dto.VehicleId.HasValue)
            {
                vehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.Id == request.Dto.VehicleId.Value, cancellationToken)
                    ?? throw new InvalidOperationException($"Vehicle with ID '{request.Dto.VehicleId}' was not found.");
            }

            var route = new DeliveryRoute
            {
                Id = Guid.NewGuid(),
                Date = request.Dto.Date,
                ZoneId = request.Dto.ZoneId,
                Zone = zone,
                DriverId = driver?.Id,
                Driver = driver,
                VehicleId = vehicle?.Id,
                Vehicle = vehicle,
                Status = RouteStatus.Draft,
                EstimatedStops = 0,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = _currentUser.UserId
            };

            context.DeliveryRoutes.Add(route);
            await context.SaveChangesAsync(cancellationToken);

            var loaded = await context.DeliveryRoutes
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .Include(r => r.RouteParcels)
                .FirstAsync(r => r.Id == route.Id, cancellationToken);

            return RouteMapper.ToDto(loaded);
        }
    }
}
