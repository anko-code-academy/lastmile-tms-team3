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

    public Guid? DriverId { get; set; }
    public Driver? Driver { get; set; }

    public Guid? ZoneId { get; set; }
    public Zone? Zone { get; set; }

    public DateOnly Date { get; set; }

    public RouteStatus Status { get; set; } = RouteStatus.Draft;

    public DateTimeOffset? LoadedAt { get; set; }

    public ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
}
