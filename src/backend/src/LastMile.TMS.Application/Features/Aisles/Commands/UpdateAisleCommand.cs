using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Common.Security;
using LastMile.TMS.Application.Features.Aisles.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Aisles.Commands;

public static class UpdateAisle
{
    public record Command(UpdateAisleDto Dto) : IRequest<AisleDto>;

    public class Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        : IRequestHandler<Command, AisleDto>
    {
        public async Task<AisleDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var aisle = await context.Aisles
                .Include(a => a.Zone)
                .Include(a => a.Bins)
                    .ThenInclude(bin => bin.Parcels)
                .FirstOrDefaultAsync(a => a.Id == request.Dto.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Aisle with ID {request.Dto.Id} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, aisle.Zone.DepotId);

            if (aisle.Bins.Any(bin => bin.Parcels.Count > 0))
                throw new InvalidOperationException("This aisle cannot be edited or made inactive while bins still contain parcels.");

            aisle.Name = request.Dto.Name.Trim();
            aisle.IsActive = request.Dto.IsActive;
            foreach (var bin in aisle.Bins)
            {
                bin.IsActive = request.Dto.IsActive;
                bin.LastModifiedAt = DateTimeOffset.UtcNow;
                bin.LastModifiedBy = currentUser.UserId;
            }
            aisle.Notes = string.IsNullOrWhiteSpace(request.Dto.Notes) ? null : request.Dto.Notes.Trim();
            aisle.LastModifiedAt = DateTimeOffset.UtcNow;
            aisle.LastModifiedBy = currentUser.UserId;

            await context.SaveChangesAsync(cancellationToken);

            return new AisleDto(aisle.Id, aisle.ZoneId, aisle.Name, aisle.Code, aisle.SortOrder, aisle.IsActive, aisle.Notes);
        }
    }
}