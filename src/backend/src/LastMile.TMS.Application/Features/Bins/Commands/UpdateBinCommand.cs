using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Aisles.Commands;
using LastMile.TMS.Application.Features.Bins.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Bins.Commands;

public static class UpdateBin
{
    public record Command(UpdateBinDto Dto) : IRequest<BinDto>;

    public class Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        : IRequestHandler<Command, BinDto>
    {
        public async Task<BinDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var bin = await context.Bins
                .Include(b => b.Aisle)
                    .ThenInclude(a => a.Zone)
                .Include(b => b.Parcels)
                .FirstOrDefaultAsync(b => b.Id == request.Dto.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Bin with ID {request.Dto.Id} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, bin.Aisle.Zone.DepotId);

            if (bin.Parcels.Count > 0)
                throw new InvalidOperationException("This bin cannot be edited or made inactive while parcels are assigned to it.");

            bin.Name = request.Dto.Name.Trim();
            bin.Code = request.Dto.Code.Trim().ToUpperInvariant();
            bin.CapacityParcelCount = request.Dto.CapacityParcelCount;
            bin.IsActive = request.Dto.IsActive;
            bin.Notes = string.IsNullOrWhiteSpace(request.Dto.Notes) ? null : request.Dto.Notes.Trim();
            bin.LastModifiedAt = DateTimeOffset.UtcNow;
            bin.LastModifiedBy = currentUser.UserId;

            await context.SaveChangesAsync(cancellationToken);

            var currentParcelCount = bin.Parcels.Count;
            var utilizationPercent = bin.CapacityParcelCount <= 0
                ? 0m
                : Math.Round(currentParcelCount * 100m / bin.CapacityParcelCount, 2);

            return new BinDto(
                bin.Id,
                bin.AisleId,
                bin.Name,
                bin.Code,
                bin.LabelCode,
                bin.CapacityParcelCount,
                currentParcelCount,
                utilizationPercent,
                bin.IsActive,
                bin.Notes);
        }
    }
}