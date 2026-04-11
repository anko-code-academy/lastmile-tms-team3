using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class AutoAssignParcels
{
    public record Command(Guid RouteId) : IRequest<RouteDto>;

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
                .Include(r => r.RouteParcels)
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.Id == request.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.RouteId}' was not found.");

            var existingParcelIds = route.RouteParcels.Select(rp => rp.ParcelId).ToHashSet();

            var stagedParcels = await context.Parcels
                .Where(p => p.ZoneId == route.ZoneId
                    && p.Status == ParcelStatus.Staged
                    && !existingParcelIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            foreach (var parcel in stagedParcels)
            {
                route.AddParcel(parcel);
            }

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
