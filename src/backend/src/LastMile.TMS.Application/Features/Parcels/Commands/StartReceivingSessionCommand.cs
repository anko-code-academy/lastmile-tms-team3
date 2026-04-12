using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class StartReceivingSession
{
    public record Command(StartReceivingSessionDto Dto) : IRequest<StartReceivingSessionResultDto>;

    public class Handler : IRequestHandler<Command, StartReceivingSessionResultDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<StartReceivingSessionResultDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var manifest = await context.InboundManifests
                .FirstOrDefaultAsync(m => m.Id == request.Dto.ManifestId, cancellationToken)
                ?? throw new InvalidOperationException($"Manifest {request.Dto.ManifestId} not found.");

            if (manifest.Status == InboundManifestStatus.Closed)
                throw new InvalidOperationException("Cannot start a session on a closed manifest.");

            var session = new InboundReceivingSession
            {
                Id = Guid.NewGuid(),
                ManifestId = manifest.Id,
                Status = InboundReceivingSessionStatus.Open,
                DockDoor = request.Dto.DockDoor,
                StartedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow
            };

            context.InboundReceivingSessions.Add(session);
            await context.SaveChangesAsync(cancellationToken);

            return new StartReceivingSessionResultDto(session.Id, manifest.Id, session.DockDoor);
        }
    }
}
