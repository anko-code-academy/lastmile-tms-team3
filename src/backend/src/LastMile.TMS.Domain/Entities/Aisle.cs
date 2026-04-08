using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;

public class Aisle : BaseAuditableEntity, IAuditTracked
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    public int SortOrder { get; set; }
    public bool IsActive { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public Guid ZoneId { get; set; }
    public Zone Zone { get; set; } = null!;

    public ICollection<Bin> Bins { get; set; } = new List<Bin>();
}