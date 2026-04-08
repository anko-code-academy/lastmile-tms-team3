using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;

public class Bin : BaseAuditableEntity, IAuditTracked
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LabelCode { get; set; } = string.Empty;

    public int CapacityParcelCount { get; set; }
    public bool IsActive { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid AisleId { get; set; }
    public Aisle Aisle { get; set; } = null!;

    public ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
}