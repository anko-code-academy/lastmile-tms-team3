using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Entities;
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

                return BuildResult(parcel, bin: null, isMissort: false, isUnsortable: true);
            }

            // Mis-sort: operator scanned a different zone bin
            if (request.Dto.ScannedZoneId.HasValue && request.Dto.ScannedZoneId.Value != parcel.ZoneId.Value)
            {
                return BuildResult(parcel, bin: null, isMissort: true, isUnsortable: false);
            }

            // Find an available bin in the parcel's zone (two-step to support EF InMemory in tests)
            var aisleIdsInZone = await context.Aisles
                .Where(a => a.IsActive && a.ZoneId == parcel.ZoneId.Value)
                .Select(a => a.Id)
                .ToListAsync(cancellationToken);

            var binsInZone = await context.Bins
                .Where(b => b.IsActive && aisleIdsInZone.Contains(b.AisleId))
                .OrderBy(b => b.Code)
                .ToListAsync(cancellationToken);

            var occupiedCounts = await context.Parcels
                .Where(p => p.CurrentBinId != null)
                .GroupBy(p => p.CurrentBinId!.Value)
                .Select(g => new { BinId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.BinId, g => g.Count, cancellationToken);

            var bin = binsInZone.FirstOrDefault(b =>
                occupiedCounts.GetValueOrDefault(b.Id, 0) < b.CapacityParcelCount);

            if (bin is not null)
                parcel.AssignToBin(bin);

            // Happy path: transition to Sorted
            parcel.TransitionToStatus(
                ParcelStatus.Sorted,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return BuildResult(parcel, bin, isMissort: false, isUnsortable: false);
        }

        private static SortParcelResultDto BuildResult(
            Parcel parcel,
            Bin? bin,
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
                BinId: bin?.Id,
                BinCode: bin?.Code,
                IsMissort: isMissort,
                IsUnsortable: isUnsortable,
                TrackingEvents: trackingEvents);
        }
    }
}
