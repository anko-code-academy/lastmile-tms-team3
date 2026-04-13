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

            var sessionData = await context.InboundReceivingSessions
                .Where(s => s.Id == request.Dto.SessionId)
                .Select(s => new
                {
                    Session = s,
                    IsInManifest = context.InboundManifests
                        .Where(m => m.Id == s.ManifestId)
                        .SelectMany(m => m.Parcels)
                        .Any(p => p.Id == parcel.Id)
                })
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new InvalidOperationException($"Receiving session {request.Dto.SessionId} not found.");

            if (sessionData.Session.Status != InboundReceivingSessionStatus.Open)
                throw new InvalidOperationException("Session is not open.");

            var isUnexpected = !sessionData.IsInManifest;

            // Already processed — return friendly result without changing status
            if (parcel.Status != ParcelStatus.Registered)
            {
                return new ReceiveParcelResultDto(
                    parcel.Id,
                    parcel.TrackingNumber,
                    parcel.Status.ToString(),
                    isUnexpected,
                    IsAlreadyReceived: true,
                    sessionData.Session.Id);
            }

            var targetStatus = isUnexpected
                ? ParcelStatus.Exception
                : ParcelStatus.ReceivedAtDepot;

            parcel.TransitionToStatus(
                targetStatus,
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
                IsAlreadyReceived: false,
                sessionData.Session.Id);
        }
    }
}
