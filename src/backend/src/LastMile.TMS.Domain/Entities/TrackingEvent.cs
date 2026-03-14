using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class TrackingEvent : BaseAuditableEntity
{
    public Guid ParcelId { get; set; }
    public Parcel Parcel { get; set; } = null!;

    public DateTimeOffset Timestamp { get; set; }
    public EventType EventType { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? LocationCity { get; set; }

    [MaxLength(100)]
    public string? LocationState { get; set; }

    [MaxLength(2)]
    [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "Country code must be a two-letter ISO 3166-1 alpha-2 code")]
    public string? LocationCountryCode { get; set; }

    [MaxLength(150)]
    public string? Operator { get; set; }

    [MaxLength(500)]
    public string? DelayReason { get; set; }
}