using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class InboundReceivingSession : BaseAuditableEntity
{
    public Guid ManifestId { get; set; }
    public InboundReceivingSessionStatus Status { get; set; } = InboundReceivingSessionStatus.Open;
    public string? DockDoor { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? ConfirmedAt { get; set; }
    public string? ConfirmedBy { get; set; }

    public InboundManifest Manifest { get; set; } = null!;
}
