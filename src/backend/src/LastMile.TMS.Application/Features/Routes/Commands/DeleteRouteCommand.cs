using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class DeleteRoute
{
    public record Command(Guid RouteId) : IRequest<bool>;

    public class Handler : IRequestHandler<Command, bool>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<bool> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var route = await context.DeliveryRoutes
                .Include(r => r.RouteParcels)
                .FirstOrDefaultAsync(r => r.Id == request.RouteId, cancellationToken)
                ?? throw new InvalidOperationException($"Route with ID '{request.RouteId}' was not found.");

            if (route.Status != RouteStatus.Draft)
                throw new InvalidOperationException("Only draft routes can be deleted.");

            // Remove all RouteParcel join entries
            foreach (var rp in route.RouteParcels.ToList())
            {
                context.RouteParcels.Remove(rp);
            }

            context.DeliveryRoutes.Remove(route);
            await context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
