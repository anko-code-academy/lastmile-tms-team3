using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Domain.Entities;

public class Address : BaseAuditableEntity
{
    [Required]
    [MaxLength(200)]
    public string Street1 { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Street2 { get; set; }

    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string State { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string PostalCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(2)]
    [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "Country code must be a two-letter ISO 3166-1 alpha-2 code")]
    public string CountryCode { get; set; } = string.Empty;

    public bool IsResidential { get; set; }

    [MaxLength(150)]
    public string? ContactName { get; set; }

    [MaxLength(200)]
    public string? CompanyName { get; set; }

    [MaxLength(20)]
    public string? Phone { get; set; }

    [MaxLength(254)]
    public string? Email { get; set; }

    public Point? GeoLocation { get; set; }
}