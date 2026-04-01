using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class MarkParcelDelivered
{
    public record Command(MarkParcelDeliveredDto Dto) : IRequest<ParcelDto>;

    public class Handler : IRequestHandler<Command, ParcelDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var parcel = await context.Parcels
                .Include(p => p.TrackingEvents)
                .Include(p => p.ContentItems)
                .Include(p => p.Watchers)
                .Include(p => p.DeliveryConfirmation)
                .Include(p => p.RecipientAddress)
                .Include(p => p.ShipperAddress)
                .Include(p => p.Zone)
                .FirstOrDefaultAsync(p => p.Id == request.Dto.ParcelId, cancellationToken);

            if (parcel is null)
                throw new InvalidOperationException($"Parcel with ID '{request.Dto.ParcelId}' was not found.");

            Point? geoLocation = null;
            if (request.Dto.Latitude.HasValue && request.Dto.Longitude.HasValue)
                geoLocation = new Point(request.Dto.Longitude.Value, request.Dto.Latitude.Value) { SRID = 4326 };

            parcel.MarkAsDelivered(
                request.Dto.ReceivedBy,
                request.Dto.DeliveryLocation,
                request.Dto.SignatureImage,
                request.Dto.Photo,
                geoLocation,
                request.Dto.OperatorName,
                request.Dto.LocationCity,
                request.Dto.LocationState,
                request.Dto.LocationCountryCode);

            await context.SaveChangesAsync(cancellationToken);

            return ParcelMapper.ToDto(parcel);
        }
    }
}
