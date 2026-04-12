using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;

public class RouteParcel : BaseEntity
{
    public Guid RouteId { get; set; }
    public DeliveryRoute DeliveryRoute { get; set; } = null!;

    public Guid ParcelId { get; set; }
    public Parcel Parcel { get; set; } = null!;

    public int StopOrder { get; set; }
    public DateTimeOffset AddedAt { get; set; }
}
