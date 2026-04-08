using LastMile.TMS.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Aisles.Commands;

public static class DeleteAisle
{
    public record Command(Guid Id) : IRequest<bool>;

    public class Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        : IRequestHandler<Command, bool>
    {
        public async Task<bool> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var aisle = await context.Aisles
                .Include(item => item.Zone)
                .Include(item => item.Bins)
                    .ThenInclude(item => item.Parcels)
                .FirstOrDefaultAsync(item => item.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Aisle with ID {request.Id} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, aisle.Zone.DepotId);

            if (aisle.Bins.Any(bin => bin.Parcels.Count > 0))
                throw new InvalidOperationException("This aisle cannot be deleted while bins still contain parcels.");

            context.Bins.RemoveRange(aisle.Bins);
            context.Aisles.Remove(aisle);
            await context.SaveChangesAsync(cancellationToken);

            return true;
        }
    }
}