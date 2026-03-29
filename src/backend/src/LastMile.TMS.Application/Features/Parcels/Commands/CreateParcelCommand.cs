using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class CreateParcel
{
    public record Command(CreateParcelDto Dto) : IRequest<ParcelDto>;

    public class Handler : IRequestHandler<Command, ParcelDto>
    {
        private readonly IAppDbContextFactory _contextFactory;
        private readonly ICurrentUserService _currentUser;
        private readonly IZoneMatchingService _zoneMatchingService;

        public Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser, IZoneMatchingService zoneMatchingService)
        {
            _contextFactory = contextFactory;
            _currentUser = currentUser;
            _zoneMatchingService = zoneMatchingService;
        }

        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var now = DateTimeOffset.UtcNow;

            var recipientAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = request.Dto.RecipientAddress.Street1,
                Street2 = request.Dto.RecipientAddress.Street2,
                City = request.Dto.RecipientAddress.City,
                State = request.Dto.RecipientAddress.State,
                PostalCode = request.Dto.RecipientAddress.PostalCode,
                CountryCode = request.Dto.RecipientAddress.CountryCode,
                IsResidential = request.Dto.RecipientAddress.IsResidential,
                ContactName = request.Dto.RecipientAddress.ContactName,
                CompanyName = request.Dto.RecipientAddress.CompanyName,
                Phone = request.Dto.RecipientAddress.Phone,
                Email = request.Dto.RecipientAddress.Email,
                GeoLocation = CreatePoint(request.Dto.RecipientAddress.Latitude, request.Dto.RecipientAddress.Longitude),
                CreatedAt = now,
                CreatedBy = _currentUser.UserId
            };

            var shipperAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = request.Dto.ShipperAddress.Street1,
                Street2 = request.Dto.ShipperAddress.Street2,
                City = request.Dto.ShipperAddress.City,
                State = request.Dto.ShipperAddress.State,
                PostalCode = request.Dto.ShipperAddress.PostalCode,
                CountryCode = request.Dto.ShipperAddress.CountryCode,
                IsResidential = request.Dto.ShipperAddress.IsResidential,
                ContactName = request.Dto.ShipperAddress.ContactName,
                CompanyName = request.Dto.ShipperAddress.CompanyName,
                Phone = request.Dto.ShipperAddress.Phone,
                Email = request.Dto.ShipperAddress.Email,
                GeoLocation = CreatePoint(request.Dto.ShipperAddress.Latitude, request.Dto.ShipperAddress.Longitude),
                CreatedAt = now,
                CreatedBy = _currentUser.UserId
            };

            Guid? zoneId = null;
            if (recipientAddress.GeoLocation is not null)
            {
                zoneId = await _zoneMatchingService.FindMatchingZoneIdAsync(recipientAddress.GeoLocation, cancellationToken);
            }

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = request.Dto.TrackingNumber,
                Description = request.Dto.Description,
                ServiceType = request.Dto.ServiceType,
                Status = ParcelStatus.Registered,
                RecipientAddressId = recipientAddress.Id,
                RecipientAddress = recipientAddress,
                ShipperAddressId = shipperAddress.Id,
                ShipperAddress = shipperAddress,
                Weight = request.Dto.Weight,
                WeightUnit = request.Dto.WeightUnit,
                Length = request.Dto.Length,
                Width = request.Dto.Width,
                Height = request.Dto.Height,
                DimensionUnit = request.Dto.DimensionUnit,
                DeclaredValue = request.Dto.DeclaredValue,
                Currency = request.Dto.Currency,
                ParcelType = request.Dto.ParcelType,
                ZoneId = zoneId,
                DeliveryAttempts = 0,
                CreatedAt = now,
                CreatedBy = _currentUser.UserId
            };

            context.Parcels.Add(parcel);
            await context.SaveChangesAsync(cancellationToken);

            return ParcelMapper.ToDto(parcel);
        }

        private static Point? CreatePoint(double? latitude, double? longitude)
        {
            return latitude.HasValue && longitude.HasValue
                ? new Point(longitude.Value, latitude.Value) { SRID = 4326 }
                : null;
        }
    }
}
