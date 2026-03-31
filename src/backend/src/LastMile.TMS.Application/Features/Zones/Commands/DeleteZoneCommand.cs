using LastMile.TMS.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Zones.Commands;

public static class DeleteZone
{
    public record Command(Guid Id) : IRequest<bool>;

    public class Handler : IRequestHandler<Command, bool>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<bool> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var zone = await context.Zones
                .FirstOrDefaultAsync(z => z.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Zone with ID {request.Id} not found");

            context.Zones.Remove(zone);
            await context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
