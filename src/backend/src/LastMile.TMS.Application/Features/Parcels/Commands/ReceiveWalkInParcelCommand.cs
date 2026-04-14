using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class ReceiveWalkInParcel
{
    public record Command(ReceiveWalkInParcelDto Dto) : IRequest<ReceiveWalkInParcelResultDto>;

    public class Handler : IRequestHandler<Command, ReceiveWalkInParcelResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<ReceiveWalkInParcelResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .FirstOrDefaultAsync(p => p.TrackingNumber == request.Dto.TrackingNumber, cancellationToken)
                ?? throw new InvalidOperationException($"Parcel with tracking number '{request.Dto.TrackingNumber}' not found.");

            if (parcel.Status != ParcelStatus.Registered)
                throw new InvalidOperationException($"Parcel '{request.Dto.TrackingNumber}' is in status '{parcel.Status}', expected 'Registered'.");

            var belongsToActiveManifest = await context.InboundManifests
                .Where(m => m.Status != InboundManifestStatus.Closed)
                .SelectMany(m => m.Parcels)
                .AnyAsync(p => p.Id == parcel.Id, cancellationToken);

            var isMisdirected = belongsToActiveManifest;
            var targetStatus = isMisdirected
                ? ParcelStatus.Exception
                : ParcelStatus.ReceivedAtDepot;

            parcel.TransitionToStatus(
                targetStatus,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return new ReceiveWalkInParcelResultDto(
                parcel.Id,
                parcel.TrackingNumber,
                parcel.Status.ToString(),
                isMisdirected);
        }
    }
}
