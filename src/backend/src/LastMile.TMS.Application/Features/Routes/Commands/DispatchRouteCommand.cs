using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Common.Security;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class DispatchRoute
{
    public record Command(DispatchRouteDto Dto) : IRequest<RouteDto>;

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
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .Include(r => r.RouteParcels)
                    .ThenInclude(rp => rp.Parcel)
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            DepotAccessGuard.EnsureDepotAccess(_currentUser, route.DepotId);

            // Domain validation and status transition
            route.Dispatch();

            // Transition all loaded parcels to OutForDelivery
            foreach (var routeParcel in route.RouteParcels)
            {
                if (routeParcel.Parcel is not null && routeParcel.Parcel.Status == ParcelStatus.Loaded)
                {
                    routeParcel.Parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                }
            }

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
