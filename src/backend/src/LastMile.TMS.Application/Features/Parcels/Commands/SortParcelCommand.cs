using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class SortParcel
{
    public record Command(SortParcelDto Dto) : IRequest<SortParcelResultDto>;

    public class Handler : IRequestHandler<Command, SortParcelResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<SortParcelResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .Include(p => p.TrackingEvents)
                .Include(p => p.Zone)
                .FirstOrDefaultAsync(p => p.TrackingNumber == request.Dto.TrackingNumber, cancellationToken);

            if (parcel is null)
                throw new ParcelNotFoundException(request.Dto.TrackingNumber);

            if (parcel.Status != ParcelStatus.ReceivedAtDepot)
                throw new InvalidStatusTransitionException(parcel.Status, ParcelStatus.Sorted);

            // Unsortable: no zone assigned (bad address)
            if (parcel.ZoneId is null)
            {
                parcel.TransitionToStatus(
                    ParcelStatus.Exception,
                    request.Dto.OperatorName,
                    request.Dto.LocationCity,
                    request.Dto.LocationState,
                    request.Dto.LocationCountryCode);

                await context.SaveChangesAsync(cancellationToken);

                return BuildResult(parcel, isMissort: false, isUnsortable: true);
            }

            // Mis-sort: operator scanned a different zone bin
            if (request.Dto.ScannedZoneId.HasValue && request.Dto.ScannedZoneId.Value != parcel.ZoneId.Value)
            {
                return BuildResult(parcel, isMissort: true, isUnsortable: false);
            }

            // Happy path: transition to Sorted
            parcel.TransitionToStatus(
                ParcelStatus.Sorted,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return BuildResult(parcel, isMissort: false, isUnsortable: false);
        }

        private static SortParcelResultDto BuildResult(
            Domain.Entities.Parcel parcel,
            bool isMissort,
            bool isUnsortable)
        {
            var trackingEvents = parcel.TrackingEvents
                .OrderByDescending(e => e.Timestamp)
                .Select(e => new TrackingEventDto(
                    e.Id,
                    e.Timestamp,
                    e.EventType,
                    e.Description,
                    e.LocationCity,
                    e.LocationState,
                    e.LocationCountryCode,
                    e.Operator,
                    e.DelayReason,
                    e.CreatedAt))
                .ToList();

            return new SortParcelResultDto(
                ParcelId: parcel.Id,
                TrackingNumber: parcel.TrackingNumber,
                Status: parcel.Status,
                ZoneId: parcel.ZoneId,
                ZoneName: parcel.Zone?.Name,
                IsMissort: isMissort,
                IsUnsortable: isUnsortable,
                TrackingEvents: trackingEvents);
        }
    }
}
