using System;
using FluentAssertions;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Rules;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Rules;

public class ParcelStatusRulesTests
{
    [Theory]
    [InlineData(ParcelStatus.Registered, ParcelStatus.ReceivedAtDepot, true)]
    [InlineData(ParcelStatus.Registered, ParcelStatus.Cancelled, true)]
    [InlineData(ParcelStatus.Registered, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.Registered, ParcelStatus.Delivered, false)]
    [InlineData(ParcelStatus.Registered, ParcelStatus.OutForDelivery, false)]

    [InlineData(ParcelStatus.ReceivedAtDepot, ParcelStatus.Sorted, true)]
    [InlineData(ParcelStatus.ReceivedAtDepot, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.ReceivedAtDepot, ParcelStatus.Registered, false)]
    [InlineData(ParcelStatus.ReceivedAtDepot, ParcelStatus.Delivered, false)]

    [InlineData(ParcelStatus.Sorted, ParcelStatus.Staged, true)]
    [InlineData(ParcelStatus.Sorted, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.Sorted, ParcelStatus.ReceivedAtDepot, false)]
    [InlineData(ParcelStatus.Sorted, ParcelStatus.Delivered, false)]

    [InlineData(ParcelStatus.Staged, ParcelStatus.Loaded, true)]
    [InlineData(ParcelStatus.Staged, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.Staged, ParcelStatus.Sorted, false)]
    [InlineData(ParcelStatus.Staged, ParcelStatus.Delivered, false)]

    [InlineData(ParcelStatus.Loaded, ParcelStatus.OutForDelivery, true)]
    [InlineData(ParcelStatus.Loaded, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.Loaded, ParcelStatus.Staged, false)]
    [InlineData(ParcelStatus.Loaded, ParcelStatus.Delivered, false)]

    [InlineData(ParcelStatus.OutForDelivery, ParcelStatus.Delivered, true)]
    [InlineData(ParcelStatus.OutForDelivery, ParcelStatus.FailedAttempt, true)]
    [InlineData(ParcelStatus.OutForDelivery, ParcelStatus.Exception, true)]
    [InlineData(ParcelStatus.OutForDelivery, ParcelStatus.Cancelled, false)]
    [InlineData(ParcelStatus.OutForDelivery, ParcelStatus.Loaded, false)]

    [InlineData(ParcelStatus.FailedAttempt, ParcelStatus.OutForDelivery, true)]
    [InlineData(ParcelStatus.FailedAttempt, ParcelStatus.ReturnedToDepot, true)]
    [InlineData(ParcelStatus.FailedAttempt, ParcelStatus.Delivered, true)]
    [InlineData(ParcelStatus.FailedAttempt, ParcelStatus.Loaded, false)]
    [InlineData(ParcelStatus.FailedAttempt, ParcelStatus.Cancelled, false)]

    [InlineData(ParcelStatus.Delivered, ParcelStatus.Registered, false)]
    [InlineData(ParcelStatus.Delivered, ParcelStatus.Cancelled, false)]

    [InlineData(ParcelStatus.ReturnedToDepot, ParcelStatus.Registered, false)]
    [InlineData(ParcelStatus.ReturnedToDepot, ParcelStatus.Cancelled, false)]

    [InlineData(ParcelStatus.Cancelled, ParcelStatus.Registered, false)]
    [InlineData(ParcelStatus.Cancelled, ParcelStatus.Delivered, false)]

    [InlineData(ParcelStatus.Exception, ParcelStatus.ReturnedToDepot, true)]
    [InlineData(ParcelStatus.Exception, ParcelStatus.Cancelled, true)]
    [InlineData(ParcelStatus.Exception, ParcelStatus.Delivered, false)]
    public void CanTransition_ShouldReturnExpectedResult(
        ParcelStatus currentStatus,
        ParcelStatus targetStatus,
        bool expectedResult)
    {
        // Act
        var result = ParcelStatusRules.CanTransition(currentStatus, targetStatus);

        // Assert
        result.Should().Be(expectedResult);
    }

    [Theory]
    [InlineData(ParcelStatus.Delivered, true)]
    [InlineData(ParcelStatus.Cancelled, true)]
    [InlineData(ParcelStatus.ReturnedToDepot, true)]
    [InlineData(ParcelStatus.Registered, false)]
    [InlineData(ParcelStatus.Exception, false)]
    [InlineData(ParcelStatus.OutForDelivery, false)]
    public void IsTerminal_ShouldReturnExpectedResult(ParcelStatus status, bool expected)
    {
        // Act
        var result = ParcelStatusRules.IsTerminal(status);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(ParcelStatus.Registered, true)]
    [InlineData(ParcelStatus.ReceivedAtDepot, true)]
    [InlineData(ParcelStatus.Sorted, true)]
    [InlineData(ParcelStatus.Staged, true)]
    [InlineData(ParcelStatus.Loaded, true)]
    [InlineData(ParcelStatus.OutForDelivery, true)]
    [InlineData(ParcelStatus.FailedAttempt, false)]
    [InlineData(ParcelStatus.Delivered, false)]
    [InlineData(ParcelStatus.Cancelled, false)]
    [InlineData(ParcelStatus.ReturnedToDepot, false)]
    [InlineData(ParcelStatus.Exception, false)]
    public void IsExceptionEligible_ShouldReturnExpectedResult(ParcelStatus status, bool expected)
    {
        // Act
        var result = ParcelStatusRules.IsExceptionEligible(status);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void GetAllowedTransitions_ForRegistered_ShouldReturnCorrectList()
    {
        // Act
        var result = ParcelStatusRules.GetAllowedTransitions(ParcelStatus.Registered);

        // Assert
        result.Should().BeEquivalentTo(new[]
        {
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Cancelled,
            ParcelStatus.Exception
        });
    }

    [Fact]
    public void GetAllowedTransitions_ForOutForDelivery_ShouldReturnCorrectList()
    {
        // Act
        var result = ParcelStatusRules.GetAllowedTransitions(ParcelStatus.OutForDelivery);

        // Assert
        result.Should().BeEquivalentTo(new[]
        {
            ParcelStatus.Delivered,
            ParcelStatus.FailedAttempt,
            ParcelStatus.Exception
        });
    }

    [Fact]
    public void GetAllowedTransitions_ForFailedAttempt_ShouldReturnCorrectList()
    {
        // Act
        var result = ParcelStatusRules.GetAllowedTransitions(ParcelStatus.FailedAttempt);

        // Assert
        result.Should().BeEquivalentTo(new[]
        {
            ParcelStatus.OutForDelivery,
            ParcelStatus.ReturnedToDepot,
            ParcelStatus.Delivered
        });
    }

    [Fact]
    public void GetAllowedTransitions_ForTerminalStatus_ShouldReturnEmpty()
    {
        // Arrange
        var terminalStatuses = new[] { ParcelStatus.Delivered, ParcelStatus.Cancelled, ParcelStatus.ReturnedToDepot };

        foreach (var status in terminalStatuses)
        {
            // Act
            var result = ParcelStatusRules.GetAllowedTransitions(status);

            // Assert
            result.Should().BeEmpty();
        }
    }

    [Fact]
    public void MaxDeliveryAttempts_ShouldBeThree()
    {
        // Assert
        ParcelStatusRules.MaxDeliveryAttempts.Should().Be(3);
    }
}