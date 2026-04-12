using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class InboundManifest : BaseAuditableEntity
{
    public string ManifestNumber { get; set; } = string.Empty;
    public Guid DepotId { get; set; }
    public InboundManifestStatus Status { get; set; } = InboundManifestStatus.Open;
    public int MaxParcels { get; set; }

    public Depot Depot { get; set; } = null!;
    public ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
    public ICollection<InboundReceivingSession> Sessions { get; set; } = new List<InboundReceivingSession>();
}
