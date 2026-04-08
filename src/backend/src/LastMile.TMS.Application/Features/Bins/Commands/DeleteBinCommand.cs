using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Aisles.Commands;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Bins.Commands;

public static class DeleteBin
{
    public record Command(Guid Id) : IRequest<bool>;

    public class Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        : IRequestHandler<Command, bool>
    {
        public async Task<bool> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var bin = await context.Bins
                .Include(item => item.Aisle)
                    .ThenInclude(item => item.Zone)
                .Include(item => item.Parcels)
                .FirstOrDefaultAsync(item => item.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Bin with ID {request.Id} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, bin.Aisle.Zone.DepotId);

            if (bin.Parcels.Count > 0)
                throw new InvalidOperationException("This bin cannot be deleted while parcels are assigned to it.");

            context.Bins.Remove(bin);
            await context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}