using System.ComponentModel.DataAnnotations;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Rules;
using LastMile.TMS.Domain.Exceptions;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Domain.Entities;

public class Parcel : BaseAuditableEntity
{
    [Required]
    [MaxLength(50)]
    public string TrackingNumber { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public ServiceType ServiceType { get; set; }
    public ParcelStatus Status { get; set; }

    // Address relationships
    public Guid ShipperAddressId { get; set; }
    public Address ShipperAddress { get; set; } = null!;

    public Guid RecipientAddressId { get; set; }
    public Address RecipientAddress { get; set; } = null!;

    // Physical properties
    public decimal Weight { get; set; }
    public WeightUnit WeightUnit { get; set; }
    public decimal Length { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public DimensionUnit DimensionUnit { get; set; }

    // Value
    public decimal DeclaredValue { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    // Dates
    public DateTimeOffset? EstimatedDeliveryDate { get; set; }
    public DateTimeOffset? ActualDeliveryDate { get; set; }

    // Delivery tracking
    public int DeliveryAttempts { get; set; }

    // ParcelType (notes field from MVP spec)
    [MaxLength(100)]
    public string? ParcelType { get; set; }

    // Zone assignment (auto-assigned via geocoding)
    public Guid? ZoneId { get; set; }
    public Zone? Zone { get; set; }

    // Navigation properties
    public ICollection<TrackingEvent> TrackingEvents { get; set; } = new List<TrackingEvent>();
    public ICollection<ParcelContentItem> ContentItems { get; set; } = new List<ParcelContentItem>();
    public DeliveryConfirmation? DeliveryConfirmation { get; set; }
    public ICollection<ParcelWatcher> Watchers { get; set; } = new List<ParcelWatcher>();

    // Domain methods
    public void TransitionToStatus(
        ParcelStatus newStatus,
        string? operatorName = null,
        string? locationCity = null,
        string? locationState = null,
        string? locationCountryCode = null)
    {
        if (ParcelStatusRules.IsTerminal(Status))
            throw new ParcelInTerminalStateException(Status);

        if (!ParcelStatusRules.CanTransition(Status, newStatus))
            throw new InvalidStatusTransitionException(Status, newStatus);

        var previousStatus = Status;
        Status = newStatus;

        // Record tracking event for status change
        var trackingEvent = new TrackingEvent
        {
            ParcelId = Id,
            Timestamp = DateTimeOffset.UtcNow,
            EventType = MapStatusToEventType(newStatus),
            Description = $"Status changed from {previousStatus} to {newStatus}",
            LocationCity = locationCity,
            LocationState = locationState,
            LocationCountryCode = locationCountryCode,
            Operator = operatorName,
            CreatedAt = DateTimeOffset.UtcNow
        };

        TrackingEvents.Add(trackingEvent);

        // Update timestamps for specific statuses
        if (newStatus == ParcelStatus.Delivered)
            ActualDeliveryDate = DateTimeOffset.UtcNow;
    }

    public void IncrementDeliveryAttempts()
    {
        if (DeliveryAttempts >= ParcelStatusRules.MaxDeliveryAttempts)
            throw new MaxDeliveryAttemptsReachedException(ParcelStatusRules.MaxDeliveryAttempts);

        DeliveryAttempts++;
    }

    public void MarkAsDelivered(
        string receivedBy,
        string? deliveryLocation,
        string? signatureImage,
        string? photo,
        Point? deliveryGeoLocation,
        string? operatorName = null,
        string? locationCity = null,
        string? locationState = null,
        string? locationCountryCode = null)
    {
        if (Status != ParcelStatus.OutForDelivery && Status != ParcelStatus.FailedAttempt)
            throw new InvalidStatusTransitionException(Status, ParcelStatus.Delivered);

        TransitionToStatus(ParcelStatus.Delivered, operatorName, locationCity, locationState, locationCountryCode);

        DeliveryConfirmation = new DeliveryConfirmation
        {
            ParcelId = Id,
            ReceivedBy = receivedBy,
            DeliveryLocation = deliveryLocation,
            SignatureImage = signatureImage,
            Photo = photo,
            DeliveredAt = DateTimeOffset.UtcNow,
            DeliveryGeoLocation = deliveryGeoLocation,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private static EventType MapStatusToEventType(ParcelStatus status)
    {
        return status switch
        {
            ParcelStatus.Registered => EventType.LabelCreated,
            ParcelStatus.ReceivedAtDepot => EventType.ArrivedAtFacility,
            ParcelStatus.Sorted => EventType.HeldAtFacility,
            ParcelStatus.Staged => EventType.HeldAtFacility,
            ParcelStatus.Loaded => EventType.DepartedFacility,
            ParcelStatus.OutForDelivery => EventType.OutForDelivery,
            ParcelStatus.Delivered => EventType.Delivered,
            ParcelStatus.FailedAttempt => EventType.DeliveryAttempted,
            ParcelStatus.ReturnedToDepot => EventType.Returned,
            ParcelStatus.Cancelled => EventType.Exception,
            ParcelStatus.Exception => EventType.Exception,
            _ => EventType.Exception
        };
    }
}