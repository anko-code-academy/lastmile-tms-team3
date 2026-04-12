using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;

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

        if (routeParcel.Parcel is not null)
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

    public void UnassignDriver()
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Driver can only be unassigned from a route in Draft status.");

        DriverId = null;
        Driver = null;
    }

    public void UnassignVehicle()
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Vehicle can only be unassigned from a route in Draft status.");

        VehicleId = null;
        Vehicle = null;
    }

    private void ReorderStops()
    {
        var order = 1;
        foreach (var rp in RouteParcels.OrderBy(rp => rp.StopOrder))
        {
            rp.StopOrder = order++;
        }
    }

    public void ApplyOptimizedStopOrder(
        Dictionary<Guid, int> optimizedOrder,
        decimal totalDistanceMeters)
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Stop order can only be optimized for a route in Draft status.");

        EstimatedDistance = totalDistanceMeters;

        if (RouteParcels.Count == 0) return;

        if (optimizedOrder.Count != RouteParcels.Count)
            throw new RouteOptimizationException(
                "Optimized order must include all parcels on the route.");

        foreach (var rp in RouteParcels)
        {
            if (!optimizedOrder.TryGetValue(rp.ParcelId, out var newOrder))
                throw new RouteOptimizationException(
                    "Optimized order must include all parcels on the route.");
            rp.StopOrder = newOrder;
        }
    }

    public void ReorderStopsExplicit(Dictionary<Guid, int> newOrder)
    {
        if (Status != RouteStatus.Draft)
            throw new InvalidOperationException("Stops can only be reordered on a route in Draft status.");

        var parcelIds = RouteParcels.Select(rp => rp.ParcelId).ToHashSet();
        foreach (var kvp in newOrder)
        {
            if (!parcelIds.Contains(kvp.Key))
                throw new InvalidOperationException(
                    $"Parcel '{kvp.Key}' is not on this route.");
        }

        foreach (var rp in RouteParcels)
        {
            if (newOrder.TryGetValue(rp.ParcelId, out var order))
                rp.StopOrder = order;
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
