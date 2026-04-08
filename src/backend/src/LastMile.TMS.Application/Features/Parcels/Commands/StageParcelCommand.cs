using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class StageParcel
{
    public record Command(StageParcelDto Dto) : IRequest<StageParcelResultDto>;

    public class Handler : IRequestHandler<Command, StageParcelResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<StageParcelResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .Include(p => p.TrackingEvents)
                .Include(p => p.Route)
                .FirstOrDefaultAsync(p => p.TrackingNumber == request.Dto.TrackingNumber, cancellationToken);

            if (parcel is null)
                throw new ParcelNotFoundException(request.Dto.TrackingNumber);

            if (parcel.Status != ParcelStatus.Sorted)
                throw new InvalidStatusTransitionException(parcel.Status, ParcelStatus.Staged);

            var route = await context.DeliveryRoutes
                .FirstOrDefaultAsync(r => r.Id == request.Dto.RouteId, cancellationToken);

            if (route is null)
                throw new RouteNotFoundException(request.Dto.RouteId);

            // Mis-stage: parcel is already assigned to a different route
            if (parcel.RouteId.HasValue && parcel.RouteId.Value != route.Id)
            {
                return new StageParcelResultDto(
                    ParcelId: parcel.Id,
                    TrackingNumber: parcel.TrackingNumber,
                    Status: parcel.Status,
                    RouteId: route.Id,
                    RouteName: route.Name,
                    IsMisstage: true,
                    AssignedRouteName: parcel.Route?.Name);
            }

            // Happy path: assign route and transition to Staged
            parcel.RouteId = route.Id;

            parcel.TransitionToStatus(
                ParcelStatus.Staged,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return new StageParcelResultDto(
                ParcelId: parcel.Id,
                TrackingNumber: parcel.TrackingNumber,
                Status: parcel.Status,
                RouteId: route.Id,
                RouteName: route.Name,
                IsMisstage: false,
                AssignedRouteName: null);
        }
    }
}
