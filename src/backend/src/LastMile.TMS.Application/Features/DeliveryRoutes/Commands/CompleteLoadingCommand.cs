using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.DeliveryRoutes.Commands;

public static class CompleteLoading
{
    public record Command(CompleteLoadingDto Dto) : IRequest<CompleteLoadingResultDto>;

    public class Handler : IRequestHandler<Command, CompleteLoadingResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<CompleteLoadingResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var route = await context.DeliveryRoutes
                .Include(r => r.Parcels)
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken);

            if (route is null)
                throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            // Find parcels that are not loaded (Staged)
            var unloadedParcels = route.Parcels
                .Where(p => p.Status == ParcelStatus.Staged)
                .Select(p => new ParcelInfo(
                    p.Id,
                    p.TrackingNumber,
                    p.Status))
                .ToList();

            // Short-load alert: return without completing if parcels remain
            if (!request.Dto.ForceComplete && unloadedParcels.Any())
            {
                return new CompleteLoadingResultDto(
                    RouteId: route.Id,
                    IsSuccess: false,
                    HasUnloadedParcels: true,
                    UnloadedParcelCount: unloadedParcels.Count,
                    UnloadedParcels: unloadedParcels);
            }

            // Update route status to Active
            route.Status = RouteStatus.Active;

            await context.SaveChangesAsync(cancellationToken);

            return new CompleteLoadingResultDto(
                RouteId: route.Id,
                IsSuccess: true,
                HasUnloadedParcels: unloadedParcels.Any(),
                UnloadedParcelCount: unloadedParcels.Count,
                UnloadedParcels: unloadedParcels);
        }
    }
}
