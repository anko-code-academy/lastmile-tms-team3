using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class CompleteReceivingSession
{
    public record Command(CompleteReceivingSessionDto Dto) : IRequest<CompleteReceivingSessionResultDto>;

    public class Handler : IRequestHandler<Command, CompleteReceivingSessionResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<CompleteReceivingSessionResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var session = await context.InboundReceivingSessions
                .Include(s => s.Manifest)
                .ThenInclude(m => m.Parcels)
                .FirstOrDefaultAsync(s => s.Id == request.Dto.SessionId, cancellationToken)
                ?? throw new InvalidOperationException($"Session {request.Dto.SessionId} not found.");

            if (session.Status != InboundReceivingSessionStatus.Open)
                throw new InvalidOperationException("Session is not open.");

            var manifestParcels = session.Manifest.Parcels.ToList();
            var expectedCount = manifestParcels.Count;

            // Count parcels by status at completion time
            var receivedCount = manifestParcels.Count(p => p.Status == ParcelStatus.ReceivedAtDepot);
            var misdirectedCount = manifestParcels.Count(p => p.Status == ParcelStatus.Exception);

            // Find parcels that are still Registered → these are missing
            var missingParcels = manifestParcels
                .Where(p => p.Status == ParcelStatus.Registered)
                .ToList();

            // Transition missing parcels to Exception
            foreach (var parcel in missingParcels)
            {
                parcel.TransitionToStatus(
                    ParcelStatus.Exception,
                    request.Dto.ConfirmedBy,
                    locationCity: null,
                    locationState: null,
                    locationCountryCode: null);
            }

            // Complete session
            session.Status = InboundReceivingSessionStatus.Confirmed;
            session.ConfirmedAt = DateTimeOffset.UtcNow;
            session.ConfirmedBy = request.Dto.ConfirmedBy;

            // Close manifest
            session.Manifest.Status = InboundManifestStatus.Closed;

            await context.SaveChangesAsync(cancellationToken);

            return new CompleteReceivingSessionResultDto(
                session.Id,
                expectedCount,
                receivedCount,
                missingParcels.Count,
                misdirectedCount,
                missingParcels.Select(p => new MissingParcelDto(p.TrackingNumber, p.Status.ToString())).ToList());
        }
    }
}
