using FluentValidation;
using FluentValidation.Results;
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
        private readonly IGeocodingService _geocodingService;
        private readonly IManifestAssignmentService _manifestAssignmentService;

        public Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser, IZoneMatchingService zoneMatchingService, IGeocodingService geocodingService, IManifestAssignmentService manifestAssignmentService)
        {
            _contextFactory = contextFactory;
            _currentUser = currentUser;
            _zoneMatchingService = zoneMatchingService;
            _geocodingService = geocodingService;
            _manifestAssignmentService = manifestAssignmentService;
        }

        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var now = DateTimeOffset.UtcNow;

            // Geocode both addresses in parallel
            var recipientTask = ResolveCoordinatesAsync(
                request.Dto.RecipientAddress.Street1,
                request.Dto.RecipientAddress.City,
                request.Dto.RecipientAddress.State,
                request.Dto.RecipientAddress.PostalCode,
                request.Dto.RecipientAddress.CountryCode,
                request.Dto.RecipientAddress.Latitude,
                request.Dto.RecipientAddress.Longitude,
                cancellationToken);

            var shipperTask = ResolveCoordinatesAsync(
                request.Dto.ShipperAddress.Street1,
                request.Dto.ShipperAddress.City,
                request.Dto.ShipperAddress.State,
                request.Dto.ShipperAddress.PostalCode,
                request.Dto.ShipperAddress.CountryCode,
                request.Dto.ShipperAddress.Latitude,
                request.Dto.ShipperAddress.Longitude,
                cancellationToken);

            await Task.WhenAll(recipientTask, shipperTask);

            var (recipientLat, recipientLon) = recipientTask.Result;
            var (shipperLat, shipperLon) = shipperTask.Result;

            var recipientGeoLocation = CreatePoint(recipientLat, recipientLon);
            var shipperGeoLocation = CreatePoint(shipperLat, shipperLon);

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
                GeoLocation = recipientGeoLocation,
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
                GeoLocation = shipperGeoLocation,
                CreatedAt = now,
                CreatedBy = _currentUser.UserId
            };

            Guid? zoneId = null;
            if (recipientGeoLocation is not null)
            {
                zoneId = await _zoneMatchingService.FindMatchingZoneIdAsync(recipientGeoLocation, cancellationToken);
            }
            else
            {
                throw new ValidationException(new[]
                {
                    new ValidationFailure("RecipientAddress", "Unable to geocode the recipient address. Please verify the address is valid.")
                });
            }

            if (zoneId is null)
            {
                throw new ValidationException(new[]
                {
                    new ValidationFailure("RecipientAddress", "No delivery zone found for the recipient address. Please verify the address is within the service area.")
                });
            }

            var trackingNumber = $"LMT-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = trackingNumber,
                BarcodeData = trackingNumber,
                Description = request.Dto.Description,
                ServiceType = request.Dto.ServiceType,
                Status = request.Dto.IsCustomerDropOff
                    ? ParcelStatus.ReceivedAtDepot
                    : ParcelStatus.Registered,
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
                Notes = request.Dto.Notes,
                ZoneId = zoneId,
                DeliveryAttempts = 0,
                CreatedAt = now,
                CreatedBy = _currentUser.UserId
            };

            context.Parcels.Add(parcel);

            // Assign parcel to inbound manifest based on depot (skip for customer drop-off)
            if (!request.Dto.IsCustomerDropOff && zoneId.HasValue)
            {
                var zone = await context.Zones.FindAsync(new object[] { zoneId.Value }, cancellationToken);
                if (zone is not null)
                {
                    await _manifestAssignmentService.AssignParcelToManifestAsync(context, parcel.Id, zone.DepotId, cancellationToken);
                }
            }

            await context.SaveChangesAsync(cancellationToken);

            return ParcelMapper.ToDto(parcel);
        }

        private static Point? CreatePoint(double? latitude, double? longitude)
        {
            return latitude.HasValue && longitude.HasValue
                ? new Point(longitude.Value, latitude.Value) { SRID = 4326 }
                : null;
        }

        private async Task<(double? Latitude, double? Longitude)> ResolveCoordinatesAsync(
            string street,
            string city,
            string state,
            string postalCode,
            string countryCode,
            double? providedLat,
            double? providedLon,
            CancellationToken cancellationToken)
        {
            if (providedLat.HasValue && providedLon.HasValue)
                return (providedLat, providedLon);

            var result = await _geocodingService.GeocodeAsync(
                street, city, state, postalCode, countryCode, cancellationToken);

            return result is not null ? (result.Latitude, result.Longitude) : (null, null);
        }
    }
}
