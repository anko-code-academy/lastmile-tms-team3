using LastMile.TMS.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Zones.Commands;

public static class DeleteZone
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
            var zone = await _context.Zones
                .FirstOrDefaultAsync(z => z.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Zone with ID {request.Id} not found");

            _context.Zones.Remove(zone);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}