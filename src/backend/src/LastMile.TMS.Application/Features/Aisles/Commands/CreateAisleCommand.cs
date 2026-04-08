using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Aisles.DTOs;
using LastMile.TMS.Application.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Aisles.Commands;

public static class CreateAisle
{
    public record Command(CreateAisleDto Dto) : IRequest<AisleDto>;

    public class Handler(
        IAppDbContextFactory contextFactory,
        ICurrentUserService currentUser,
        IWarehouseCodeGenerator codeGenerator)
        : IRequestHandler<Command, AisleDto>
    {
        public async Task<AisleDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = contextFactory.CreateDbContext();

            var zone = await context.Zones
                .AsNoTracking()
                .FirstOrDefaultAsync(z => z.Id == request.Dto.ZoneId, cancellationToken)
                ?? throw new KeyNotFoundException($"Zone with ID {request.Dto.ZoneId} was not found.");

            WarehouseAccessGuard.EnsureDepotAccess(currentUser, zone.DepotId);

            var code = string.IsNullOrWhiteSpace(request.Dto.Code)
                ? await codeGenerator.GenerateAisleCodeAsync(request.Dto.ZoneId, cancellationToken)
                : request.Dto.Code.Trim().ToUpperInvariant();

            var nextSortOrder = await context.Aisles
                .Where(a => a.ZoneId == request.Dto.ZoneId)
                .Select(a => (int?)a.SortOrder)
                .MaxAsync(cancellationToken) + 1 ?? 1;

            var aisle = new Domain.Entities.Aisle
            {
                Id = Guid.NewGuid(),
                ZoneId = request.Dto.ZoneId,
                Name = request.Dto.Name.Trim(),
                Code = code,
                SortOrder = nextSortOrder,
                IsActive = request.Dto.IsActive,
                Notes = string.IsNullOrWhiteSpace(request.Dto.Notes) ? null : request.Dto.Notes.Trim(),
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = currentUser.UserId
            };

            context.Aisles.Add(aisle);
            await context.SaveChangesAsync(cancellationToken);

            return new AisleDto(aisle.Id, aisle.ZoneId, aisle.Name, aisle.Code, aisle.SortOrder, aisle.IsActive, aisle.Notes);
        }
    }
}