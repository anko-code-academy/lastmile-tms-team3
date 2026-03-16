using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class Vehicle : BaseAuditableEntity
{
    [Required]
    [MaxLength(20)]
    public string RegistrationPlate { get; set; } = string.Empty;

    public VehicleType Type { get; set; }

    public VehicleStatus Status { get; set; }

    [Range(1, int.MaxValue)]
    public int ParcelCapacity { get; set; }

    [Range(1, int.MaxValue)]
    public int WeightCapacity { get; set; }

    public WeightUnit WeightUnit { get; set; }

    public Guid DepotId { get; set; }

    [ForeignKey(nameof(DepotId))]
    public Depot Depot { get; set; } = null!;
}