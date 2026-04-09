using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class ParcelLoadedEventTypeTests
{
    [Fact]
    public void TransitionToStatus_FromStagedToLoaded_ShouldCreateLoadedTrackingEvent()
    {
        // Arrange
        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Main St",
            City = "City",
            State = "State",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Oak Ave",
            City = "City",
            State = "State",
            PostalCode = "67890",
            CountryCode = "US"
        };

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "TRACK123",
            Description = "Test parcel",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Staged,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
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

        // Act
        parcel.TransitionToStatus(ParcelStatus.Loaded, "Operator");

        // Assert
        parcel.Status.Should().Be(ParcelStatus.Loaded);
        parcel.TrackingEvents.Should().ContainSingle(e =>
            e.EventType == EventType.Loaded &&
            e.Description.Contains("Status changed from Staged to Loaded"));
    }
}
