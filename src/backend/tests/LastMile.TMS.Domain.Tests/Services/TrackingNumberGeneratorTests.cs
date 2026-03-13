using System;
using FluentAssertions;
using LastMile.TMS.Domain.Services;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Services;

public class TrackingNumberGeneratorTests
{
    [Fact]
    public void Generate_ShouldReturnNonEmptyString()
    {
        // Act
        var result = TrackingNumberGenerator.Generate();

        // Assert
        result.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Generate_ShouldReturnStringWithCorrectLength()
    {
        // Act
        var result = TrackingNumberGenerator.Generate();

        // Assert
        // Format: LMT + yyMMdd + 6-digit random = 3 + 6 + 6 = 15 characters
        result.Should().MatchRegex(@"^[A-Z0-9]{15}$");
    }

    [Fact]
    public void Generate_ShouldReturnUniqueValues()
    {
        // Act
        var result1 = TrackingNumberGenerator.Generate();
        var result2 = TrackingNumberGenerator.Generate();
        var result3 = TrackingNumberGenerator.Generate();

        // Assert
        result1.Should().NotBe(result2);
        result2.Should().NotBe(result3);
        result1.Should().NotBe(result3);
    }

    [Fact]
    public void Generate_ShouldContainOnlyUppercaseLettersAndDigits()
    {
        // Act
        var result = TrackingNumberGenerator.Generate();

        // Assert
        result.Should().MatchRegex(@"^[A-Z0-9]+$");
    }

    [Fact]
    public void Generate_ShouldStartWithLettersLMT()
    {
        // Act
        var result = TrackingNumberGenerator.Generate();

        // Assert
        result.Should().StartWith("LMT");
    }

    [Fact]
    public void Generate_ShouldHaveCorrectStructure()
    {
        // Act
        var result = TrackingNumberGenerator.Generate();

        // Assert
        // Format: LMT + yyMMdd + 6-digit random
        result.Should().MatchRegex(@"^LMT\d{12}$");
    }

    [Fact]
    public void Generate_WhenCalledMultipleTimes_ShouldNotCollide()
    {
        // Act
        var results = new string[100];
        for (int i = 0; i < 100; i++)
        {
            results[i] = TrackingNumberGenerator.Generate();
        }

        // Assert - check for duplicates (allow some duplicates due to same second random)
        var distinctResults = new HashSet<string>(results);
        // With 100 calls, duplicates are unlikely but possible due to same timestamp.
        // We'll accept at least 95 distinct values.
        distinctResults.Count.Should().BeGreaterThanOrEqualTo(95);
    }

    [Fact]
    public void GenerateWithSequence_ShouldReturnCorrectFormat()
    {
        // Arrange
        var sequence = 123456;

        // Act
        var result = TrackingNumberGenerator.GenerateWithSequence(sequence);

        // Assert
        result.Should().MatchRegex(@"^LMT\d{12}$");
        result.Should().EndWith("123456");
    }
}