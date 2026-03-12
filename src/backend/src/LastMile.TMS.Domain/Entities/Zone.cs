using LastMile.TMS.Domain.Common;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Domain.Entities;

public class Zone : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public Geometry? Boundary { get; set; }
    public bool IsActive { get; set; }

    public Guid DepotId { get; set; }
    public virtual Depot Depot { get; set; } = null!;
}