using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class AssignVehicleToRoute
{
    public record Command(AssignVehicleToRouteDto Dto) : IRequest<RouteDto>;

    public class Handler : IRequestHandler<Command, RouteDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<RouteDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var route = await context.DeliveryRoutes
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            var vehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.Id == request.Dto.VehicleId, cancellationToken)
                ?? throw new InvalidOperationException($"Vehicle with ID '{request.Dto.VehicleId}' was not found.");

            route.AssignVehicle(vehicle);

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
