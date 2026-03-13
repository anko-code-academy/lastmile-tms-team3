using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Domain.Entities;

public class DeliveryConfirmation : BaseAuditableEntity
{
    public Guid ParcelId { get; set; }
    public Parcel Parcel { get; set; } = null!;

    [MaxLength(200)]
    public string? ReceivedBy { get; set; }

    [MaxLength(200)]
    public string? DeliveryLocation { get; set; }

    public string? SignatureImage { get; set; }

    public string? Photo { get; set; }

    public DateTimeOffset DeliveredAt { get; set; }

    public Point? DeliveryGeoLocation { get; set; }
}