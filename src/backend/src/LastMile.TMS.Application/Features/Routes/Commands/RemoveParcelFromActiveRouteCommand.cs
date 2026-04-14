using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class RemoveParcelFromActiveRoute
{
    public record Command(RemoveParcelFromRouteDto Dto) : IRequest<RouteDto>;

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

            var route = await context.DeliveryRoutes
                .Include(r => r.RouteParcels)
                    .ThenInclude(rp => rp.Parcel)
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            var routeParcel = route.RouteParcels
                .FirstOrDefault(rp => rp.ParcelId == request.Dto.ParcelId)
                ?? throw new InvalidOperationException($"Parcel '{request.Dto.ParcelId}' not found on this route.");

            var parcel = routeParcel.Parcel
                ?? throw new InvalidOperationException($"Parcel data not loaded for '{request.Dto.ParcelId}'.");

            // Domain: remove from route
            route.RemoveParcelFromActiveRoute(request.Dto.ParcelId);

            // Transition parcel back to Staged
            parcel.TransitionToStatus(ParcelStatus.Staged);

            // Remove from DbSet to ensure EF Core deletes the join entity
            context.RouteParcels.Remove(routeParcel);

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
