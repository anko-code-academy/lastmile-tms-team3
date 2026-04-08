using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Common.Security;
using LastMile.TMS.Application.Features.Bins.DTOs;
using LastMile.TMS.Application.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Bins.Commands;

public static class CreateBin
{
    public record Command(CreateBinDto Dto) : IRequest<BinDto>;

    public class Handler(
        IAppDbContextFactory contextFactory,
        ICurrentUserService currentUser,
        IWarehouseCodeGenerator codeGenerator)
        : IRequestHandler<Command, BinDto>
    {
        public async Task<BinDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var aisle = await context.Aisles
                .Include(a => a.Zone)
                .FirstOrDefaultAsync(a => a.Id == request.Dto.AisleId, cancellationToken)
                ?? throw new KeyNotFoundException($"Aisle with ID {request.Dto.AisleId} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, aisle.Zone.DepotId);

            var code = string.IsNullOrWhiteSpace(request.Dto.Code)
                ? await codeGenerator.GenerateBinCodeAsync(request.Dto.AisleId, cancellationToken)
                : request.Dto.Code.Trim().ToUpperInvariant();

            var bin = new Domain.Entities.Bin
            {
                Id = Guid.NewGuid(),
                AisleId = request.Dto.AisleId,
                Name = request.Dto.Name.Trim(),
                Code = code,
                LabelCode = codeGenerator.GenerateBinLabelCode(aisle.ZoneId, aisle.Code, code),
                CapacityParcelCount = request.Dto.CapacityParcelCount,
                IsActive = request.Dto.IsActive,
                Notes = string.IsNullOrWhiteSpace(request.Dto.Notes) ? null : request.Dto.Notes.Trim(),
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = currentUser.UserId
            };

            context.Bins.Add(bin);
            await context.SaveChangesAsync(cancellationToken);

            return new BinDto(bin.Id, bin.AisleId, bin.Name, bin.Code, bin.LabelCode, bin.CapacityParcelCount, 0, 0m, bin.IsActive, bin.Notes);
        }
    }
}