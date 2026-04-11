using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class DeliveryRouteTests
{
    [Fact]
    public void DeliveryRoute_Should_Have_Required_Properties()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft
        };

        // Assert
        route.Id.Should().NotBeEmpty();
        route.Name.Should().Be("Test Route");
        route.DepotId.Should().NotBeEmpty();
        route.Date.Should().NotBe(DateOnly.MinValue);
        route.Status.Should().Be(RouteStatus.Draft);
    }

    [Fact]
    public void DeliveryRoute_Should_Have_Optional_DriverId()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft,
            DriverId = Guid.NewGuid()
        };

        // Assert
        route.DriverId.Should().NotBeNull();
    }

    [Fact]
    public void DeliveryRoute_Should_Have_Optional_ZoneId()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = RouteStatus.Draft,
            ZoneId = Guid.NewGuid()
        };

        // Assert
        route.ZoneId.Should().NotBeNull();
    }

    [Fact]
    public void DeliveryRoute_Should_Have_Default_Status_Draft()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Assert
        route.Status.Should().Be(RouteStatus.Draft);
    }

    [Fact]
    public void DeliveryRoute_Should_Have_Parcels_Collection()
    {
        // Arrange & Act
        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Name = "Test Route",
            DepotId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow)
        };

        // Assert
        route.Parcels.Should().NotBeNull();
        route.Parcels.Should().BeEmpty();
    }
}
