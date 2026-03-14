using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;

public class ParcelWatcher : BaseAuditableEntity
{
    [Required]
    [MaxLength(254)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Name { get; set; }

    // Many-to-many navigation
    public ICollection<Parcel> Parcels { get; set; } = new List<Parcel>();
}