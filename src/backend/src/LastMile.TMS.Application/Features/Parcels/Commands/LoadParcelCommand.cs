using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class LoadParcel
{
    public record Command(LoadParcelDto Dto) : IRequest<LoadParcelResultDto>;

    public class Handler : IRequestHandler<Command, LoadParcelResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<LoadParcelResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .Include(p => p.TrackingEvents)
                .Include(p => p.Route)
                .FirstOrDefaultAsync(p => p.TrackingNumber == request.Dto.TrackingNumber, cancellationToken);

            if (parcel is null)
                throw new InvalidOperationException($"Parcel with tracking number '{request.Dto.TrackingNumber}' was not found.");

            var route = await context.DeliveryRoutes
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken);

            if (route is null)
                throw new InvalidOperationException($"Route with ID '{request.Dto.RouteId}' was not found.");

            // Wrong route: parcel is already assigned to a different route
            if (!request.Dto.ForceLoad && parcel.RouteId.HasValue && parcel.RouteId.Value != route.Id)
            {
                return new LoadParcelResultDto(
                    ParcelId: parcel.Id,
                    TrackingNumber: parcel.TrackingNumber,
                    Status: parcel.Status,
                    IsWrongRoute: true,
                    AssignedRouteName: parcel.Route?.Name,
                    AssignedRouteId: parcel.RouteId);
            }

            // Assign route only if parcel doesn't have one yet or is being rerouted
            if (parcel.RouteId != route.Id)
            {
                parcel.RouteId = route.Id;
                parcel.Route = route;
            }

            parcel.TransitionToStatus(
                ParcelStatus.Loaded,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return new LoadParcelResultDto(
                ParcelId: parcel.Id,
                TrackingNumber: parcel.TrackingNumber,
                Status: parcel.Status,
                IsWrongRoute: false,
                AssignedRouteName: null,
                AssignedRouteId: null);
        }
    }
}
