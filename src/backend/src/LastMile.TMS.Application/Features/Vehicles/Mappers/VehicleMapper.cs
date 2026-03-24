using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Features.Vehicles.Mappers;

public static class VehicleMapper
{
    public static VehicleDepotAddressDto ToVehicleDepotAddressDto(Address address) => new(
        address.Id,
        address.Street1,
        address.Street2,
        address.City,
        address.State,
        address.PostalCode,
        address.CountryCode,
        address.IsResidential,
        address.ContactName,
        address.CompanyName,
        address.Phone,
        address.Email,
        address.GeoLocation?.Y,
        address.GeoLocation?.X
    );

    public static VehicleDepotDto ToVehicleDepotDto(Depot depot) => new(
        depot.Id,
        depot.Name,
        depot.Address != null ? ToVehicleDepotAddressDto(depot.Address) : null,
        depot.IsActive,
        depot.CreatedAt,
        depot.LastModifiedAt
    );

    public static VehicleDto ToDto(Vehicle vehicle) => new(
        vehicle.Id,
        vehicle.RegistrationPlate,
        vehicle.Type,
        vehicle.Status,
        vehicle.ParcelCapacity,
        vehicle.WeightCapacity,
        vehicle.WeightUnit,
        vehicle.DepotId,
        vehicle.Depot != null ? ToVehicleDepotDto(vehicle.Depot) : null,
        vehicle.CreatedAt,
        vehicle.LastModifiedAt
    );
}
