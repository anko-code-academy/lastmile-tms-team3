using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class ParcelContentItem : BaseAuditableEntity
{
    public Guid ParcelId { get; set; }
    public Parcel Parcel { get; set; } = null!;

    [Required]
    [MaxLength(7)]
    [RegularExpression(@"^\d{4}\.\d{2}$", ErrorMessage = "HS Code must be in format XXXX.XX")]
    public string HsCode { get; set; } = string.Empty; // Format: XXXX.XX

    [Required]
    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitValue { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    public decimal Weight { get; set; }
    public WeightUnit WeightUnit { get; set; }

    [Required]
    [MaxLength(2)]
    [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "Country code must be a two-letter ISO 3166-1 alpha-2 code")]
    public string OriginCountryCode { get; set; } = string.Empty; // ISO 3166-1 alpha-2
}