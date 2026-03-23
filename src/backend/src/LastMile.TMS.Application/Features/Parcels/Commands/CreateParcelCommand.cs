using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Parcels.DTOs;
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
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;
        private readonly IZoneMatchingService _zoneMatchingService;

        public Handler(IAppDbContext context, ICurrentUserService currentUser, IZoneMatchingService zoneMatchingService)
        {
            _context = context;
            _currentUser = currentUser;
            _zoneMatchingService = zoneMatchingService;
        }

        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var now = DateTimeOffset.UtcNow;

            // Create recipient address
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

            // Create shipper address
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

            // Auto-assign zone based on recipient address coordinates
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

            _context.Parcels.Add(parcel);
            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(parcel);
        }

        private static Point? CreatePoint(double? latitude, double? longitude)
        {
            return latitude.HasValue && longitude.HasValue
                ? new Point(longitude.Value, latitude.Value) { SRID = 4326 }
                : null;
        }

        private static ParcelDto MapToDto(Parcel parcel) => new(
            parcel.Id,
            parcel.TrackingNumber,
            parcel.Description,
            parcel.ServiceType,
            parcel.Status,
            new AddressDto(
                parcel.RecipientAddress.Street1,
                parcel.RecipientAddress.Street2,
                parcel.RecipientAddress.City,
                parcel.RecipientAddress.State,
                parcel.RecipientAddress.PostalCode,
                parcel.RecipientAddress.CountryCode,
                parcel.RecipientAddress.IsResidential,
                parcel.RecipientAddress.ContactName,
                parcel.RecipientAddress.CompanyName,
                parcel.RecipientAddress.Phone,
                parcel.RecipientAddress.Email,
                parcel.RecipientAddress.GeoLocation?.Y,
                parcel.RecipientAddress.GeoLocation?.X
            ),
            new AddressDto(
                parcel.ShipperAddress.Street1,
                parcel.ShipperAddress.Street2,
                parcel.ShipperAddress.City,
                parcel.ShipperAddress.State,
                parcel.ShipperAddress.PostalCode,
                parcel.ShipperAddress.CountryCode,
                parcel.ShipperAddress.IsResidential,
                parcel.ShipperAddress.ContactName,
                parcel.ShipperAddress.CompanyName,
                parcel.ShipperAddress.Phone,
                parcel.ShipperAddress.Email,
                parcel.ShipperAddress.GeoLocation?.Y,
                parcel.ShipperAddress.GeoLocation?.X
            ),
            parcel.Weight,
            parcel.WeightUnit,
            parcel.Length,
            parcel.Width,
            parcel.Height,
            parcel.DimensionUnit,
            parcel.DeclaredValue,
            parcel.Currency,
            parcel.EstimatedDeliveryDate,
            parcel.ActualDeliveryDate,
            parcel.DeliveryAttempts,
            parcel.ParcelType,
            parcel.ZoneId,
            parcel.Zone?.Name,
            parcel.CreatedAt,
            parcel.LastModifiedAt
        );
    }
}
