using LastMile.TMS.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Depots.Commands;

public static class DeleteDepot
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

            var depot = await context.Depots
                .Include(d => d.Address)
                .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Id} not found");

            context.Depots.Remove(depot);
            await context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}
