using LastMile.TMS.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Depots.Commands;

public static class DeleteDepot
{
    public record Command(Guid Id) : IRequest<bool>;

    public class Handler : IRequestHandler<Command, bool>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(Command request, CancellationToken cancellationToken)
        {
            var depot = await _context.Depots
                .Include(d => d.Address)
                .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Id} not found");

            _context.Depots.Remove(depot);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}