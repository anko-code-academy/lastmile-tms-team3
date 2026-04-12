using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class ReceiveParcel
{
    public record Command(ReceiveParcelDto Dto) : IRequest<ReceiveParcelResultDto>;

    public class Handler : IRequestHandler<Command, ReceiveParcelResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<ReceiveParcelResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .FirstOrDefaultAsync(p => p.TrackingNumber == request.Dto.TrackingNumber, cancellationToken)
                ?? throw new InvalidOperationException($"Parcel with tracking number '{request.Dto.TrackingNumber}' not found.");

            if (parcel.Status != ParcelStatus.Registered)
                throw new InvalidOperationException($"Parcel '{request.Dto.TrackingNumber}' is in status '{parcel.Status}', expected 'Registered'.");

            var session = await context.InboundReceivingSessions
                .FirstOrDefaultAsync(s => s.Id == request.Dto.SessionId, cancellationToken)
                ?? throw new InvalidOperationException($"Receiving session {request.Dto.SessionId} not found.");

            if (session.Status != InboundReceivingSessionStatus.Open)
                throw new InvalidOperationException("Session is not open.");

            var isUnexpected = !await context.InboundManifests
                .Where(m => m.Id == session.ManifestId)
                .SelectMany(m => m.Parcels)
                .AnyAsync(p => p.Id == parcel.Id, cancellationToken);

            parcel.TransitionToStatus(
                ParcelStatus.ReceivedAtDepot,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return new ReceiveParcelResultDto(
                parcel.Id,
                parcel.TrackingNumber,
                parcel.Status.ToString(),
                isUnexpected,
                session.Id);
        }
    }
}
