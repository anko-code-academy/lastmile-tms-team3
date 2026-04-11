using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class DeliveryRoute : BaseAuditableEntity, IAuditTracked
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public Guid DepotId { get; set; }
    public Depot Depot { get; set; } = null!;

    public DateOnly Date { get; set; }

    public Guid ZoneId { get; set; }
    public virtual Zone Zone { get; set; } = null!;

    public Guid? DriverId { get; set; }
    public virtual Driver? Driver { get; set; }

    public Guid? VehicleId { get; set; }
    public virtual Vehicle? Vehicle { get; set; }

    public RouteStatus Status { get; set; } = RouteStatus.Draft;

    public decimal? EstimatedDistance { get; set; }

    public int EstimatedStops { get; set; }

    public DateTimeOffset? LoadedAt { get; set; }

    public virtual ICollection<RouteParcel> RouteParcels { get; set; } = new List<RouteParcel>();

    public ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();

    public int ParcelCount => RouteParcels.Count;

    public void AddParcel(Parcel parcel)
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Parcels can only be added to a route in Draft status.");

        if (RouteParcels.Any(rp => rp.ParcelId == parcel.Id))
            throw new InvalidOperationException($"Parcel '{parcel.Id}' is already assigned to this route.");

        var routeParcel = new RouteParcel
        {
            RouteId = Id,
            ParcelId = parcel.Id,
            Parcel = parcel,
            StopOrder = RouteParcels.Count + 1,
            AddedAt = DateTimeOffset.UtcNow
        };

        RouteParcels.Add(routeParcel);
        RecalculateEstimatedStops();
    }

    public void RemoveParcel(Guid parcelId)
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Parcels can only be removed from a route in Draft status.");

        var routeParcel = RouteParcels.FirstOrDefault(rp => rp.ParcelId == parcelId)
            ?? throw new InvalidOperationException($"Parcel '{parcelId}' not found on this route.");

        RouteParcels.Remove(routeParcel);
        ReorderStops();
        RecalculateEstimatedStops();
    }

    public void AssignDriver(Driver driver)
    {
        ArgumentNullException.ThrowIfNull(driver);

        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Driver can only be assigned to a route in Draft status.");

        DriverId = driver.Id;
        Driver = driver;
    }

    public void AssignVehicle(Vehicle vehicle)
    {
        ArgumentNullException.ThrowIfNull(vehicle);

        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Vehicle can only be assigned to a route in Draft status.");

        VehicleId = vehicle.Id;
        Vehicle = vehicle;
    }

    private void ReorderStops()
    {
        var order = 1;
        foreach (var rp in RouteParcels.OrderBy(rp => rp.StopOrder))
        {
            rp.StopOrder = order++;
        }
    }

    private void RecalculateEstimatedStops()
    {
        EstimatedStops = RouteParcels
            .Select(rp => rp.Parcel?.RecipientAddressId)
            .Where(id => id.HasValue)
            .Distinct()
            .Count();
    }
}
