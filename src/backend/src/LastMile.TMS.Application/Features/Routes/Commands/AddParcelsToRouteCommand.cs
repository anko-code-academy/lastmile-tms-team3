using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class AddParcelsToRoute
{
    public record Command(AddParcelsToRouteDto Dto) : IRequest<RouteDto>;

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
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            var parcels = await context.Parcels
                .Where(p => request.Dto.ParcelIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            foreach (var parcel in parcels)
            {
                route.AddParcel(parcel);
            }

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
