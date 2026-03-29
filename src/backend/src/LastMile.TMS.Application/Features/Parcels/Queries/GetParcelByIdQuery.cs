using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Queries;

public static class GetParcelById
{
    public record Query(Guid Id) : IRequest<ParcelDto>;

    public class Handler : IRequestHandler<Query, ParcelDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<ParcelDto> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .Include(p => p.ShipperAddress)
                .Include(p => p.RecipientAddress)
                .Include(p => p.Zone)
                .Include(p => p.TrackingEvents)
                .Include(p => p.ContentItems)
                .Include(p => p.Watchers)
                .Include(p => p.DeliveryConfirmation)
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Parcel with ID {request.Id} not found");

            return ParcelMapper.ToDto(parcel);
        }
    }
}
