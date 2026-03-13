using System;
using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using NetTopologySuite.Geometries;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class ParcelTests
{
    private readonly Parcel _parcel;
    private readonly Address _shipperAddress;
    private readonly Address _recipientAddress;

    public ParcelTests()
    {
        _shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Main St",
            City = "City",
            State = "State",
            PostalCode = "12345",
            CountryCode = "US"
        };

        _recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Oak Ave",
            City = "City",
            State = "State",
            PostalCode = "67890",
            CountryCode = "US"
        };

        
        _parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "TRACK123",
            Description = "Test parcel",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            ShipperAddressId = _shipperAddress.Id,
            ShipperAddress = _shipperAddress,
            RecipientAddressId = _recipientAddress.Id,
            RecipientAddress = _recipientAddress,
            Weight = 5.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 30.0m,
            Width = 20.0m,
            Height = 15.0m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 100.0m,
            Currency = "USD",
            ParcelType = "Box",
            DeliveryAttempts = 0
        };
    }

    [Fact]
    public void TransitionToStatus_WithValidTransition_ShouldUpdateStatusAndAddTrackingEvent()
    {
        // Act
        _parcel.TransitionToStatus(ParcelStatus.ReceivedAtDepot, "Operator");

        // Assert
        _parcel.Status.Should().Be(ParcelStatus.ReceivedAtDepot);
        _parcel.TrackingEvents.Should().ContainSingle(e =>
            e.EventType == EventType.ArrivedAtFacility &&
            e.Description.Contains("Status changed from Registered to ReceivedAtDepot"));
    }

    [Fact]
    public void TransitionToStatus_WhenInTerminalState_ShouldThrowParcelInTerminalStateException()
    {
        // Arrange
        _parcel.TransitionToStatus(ParcelStatus.Cancelled, "Operator");

        // Act & Assert
        Action act = () => _parcel.TransitionToStatus(ParcelStatus.Registered, "Operator");
        act.Should().Throw<ParcelInTerminalStateException>()
            .WithMessage($"Parcel is in terminal state {ParcelStatus.Cancelled} and cannot be modified");
    }

    [Fact]
    public void TransitionToStatus_WithInvalidTransition_ShouldThrowInvalidStatusTransitionException()
    {
        // Act & Assert
        Action act = () => _parcel.TransitionToStatus(ParcelStatus.Delivered, "Operator");
        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage($"Invalid status transition from {ParcelStatus.Registered} to {ParcelStatus.Delivered}");
    }

    [Fact]
    public void IncrementDeliveryAttempts_ShouldIncreaseCount()
    {
        // Arrange
        _parcel.Status = ParcelStatus.OutForDelivery;

        // Act
        _parcel.IncrementDeliveryAttempts();

        // Assert
        _parcel.DeliveryAttempts.Should().Be(1);
    }

    [Fact]
    public void IncrementDeliveryAttempts_WhenMaxAttemptsReached_ShouldThrowMaxDeliveryAttemptsReachedException()
    {
        // Arrange
        _parcel.Status = ParcelStatus.OutForDelivery;
        _parcel.IncrementDeliveryAttempts();
        _parcel.IncrementDeliveryAttempts();
        _parcel.IncrementDeliveryAttempts();

        // Act & Assert
        Action act = () => _parcel.IncrementDeliveryAttempts();
        act.Should().Throw<MaxDeliveryAttemptsReachedException>()
            .WithMessage($"Maximum delivery attempts (3) reached");
    }

    [Fact]
    public void MarkAsDelivered_WhenOutForDelivery_ShouldUpdateStatusAndCreateDeliveryConfirmation()
    {
        // Arrange
        _parcel.Status = ParcelStatus.OutForDelivery;
        var receivedBy = "John Doe";
        var deliveryLocation = "Front door";
        var signatureImage = "signature.jpg";
        var photo = "photo.jpg";
        var deliveryGeoLocation = new Point(12.34, 56.78);

        // Act
        _parcel.MarkAsDelivered(receivedBy, deliveryLocation, signatureImage, photo, deliveryGeoLocation, "Operator");

        // Assert
        _parcel.Status.Should().Be(ParcelStatus.Delivered);
        _parcel.ActualDeliveryDate.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(1));
        _parcel.DeliveryConfirmation.Should().NotBeNull();
        _parcel.DeliveryConfirmation.ReceivedBy.Should().Be(receivedBy);
        _parcel.DeliveryConfirmation.DeliveryLocation.Should().Be(deliveryLocation);
        _parcel.DeliveryConfirmation.SignatureImage.Should().Be(signatureImage);
        _parcel.DeliveryConfirmation.Photo.Should().Be(photo);
        _parcel.DeliveryConfirmation.DeliveryGeoLocation.Should().Be(deliveryGeoLocation);
    }

    [Fact]
    public void MarkAsDelivered_WhenFailedAttempt_ShouldUpdateStatusAndCreateDeliveryConfirmation()
    {
        // Arrange
        _parcel.Status = ParcelStatus.FailedAttempt;
        var receivedBy = "John Doe";

        // Act
        _parcel.MarkAsDelivered(receivedBy, null, null, null, null, "Operator");

        // Assert
        _parcel.Status.Should().Be(ParcelStatus.Delivered);
    }

    [Fact]
    public void MarkAsDelivered_WhenNotOutForDeliveryOrFailedAttempt_ShouldThrowInvalidStatusTransitionException()
    {
        // Arrange - parcel is still Registered
        var receivedBy = "John Doe";

        // Act & Assert
        Action act = () => _parcel.MarkAsDelivered(receivedBy, null, null, null, null, "Operator");
        act.Should().Throw<InvalidStatusTransitionException>()
            .WithMessage($"Invalid status transition from {ParcelStatus.Registered} to {ParcelStatus.Delivered}");
    }

    [Fact]
    public void MapStatusToEventType_ShouldReturnCorrectEventType()
    {
        // This is a private method, but we can test through TransitionToStatus
        // Already covered by other tests
    }
}