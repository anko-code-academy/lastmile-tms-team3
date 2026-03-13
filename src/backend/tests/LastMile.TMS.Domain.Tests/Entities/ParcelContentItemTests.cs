using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class ParcelContentItemTests
{
    [Theory]
    [InlineData("1234.56", true)]
    [InlineData("1234.5", false)] // missing digit after dot
    [InlineData("123.45", false)] // missing digit before dot
    [InlineData("12345.67", false)] // extra digit before dot
    [InlineData("1234.567", false)] // extra digit after dot
    [InlineData("ABCD.EF", false)] // non-digits
    [InlineData("1234-56", false)] // wrong separator
    [InlineData("", false)] // empty
    [InlineData(null, false)] // null
    public void HsCode_WithVariousInputs_ShouldValidateCorrectly(string? hsCode, bool expectedIsValid)
    {
        // Arrange
        var item = new ParcelContentItem
        {
            HsCode = hsCode ?? string.Empty,
            Description = "Test item",
            Quantity = 1,
            UnitValue = 10.0m,
            Weight = 0.5m,
            WeightUnit = LastMile.TMS.Domain.Enums.WeightUnit.Kg,
            OriginCountryCode = "US"
        };

        // Act
        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(item, new ValidationContext(item), validationResults, true);

        // Assert
        isValid.Should().Be(expectedIsValid);
        if (!expectedIsValid)
        {
            validationResults.Should().Contain(r => r.MemberNames.Contains(nameof(ParcelContentItem.HsCode)));
        }
    }

    [Theory]
    [InlineData("US", true)]
    [InlineData("GB", true)]
    [InlineData("FR", true)]
    [InlineData("USA", false)] // three letters
    [InlineData("U", false)] // one letter
    [InlineData("us", false)] // lowercase
    [InlineData("12", false)] // digits
    [InlineData("", false)] // empty
    [InlineData(null, false)] // null
    public void OriginCountryCode_WithVariousInputs_ShouldValidateCorrectly(string? countryCode, bool expectedIsValid)
    {
        // Arrange
        var item = new ParcelContentItem
        {
            HsCode = "1234.56",
            Description = "Test item",
            Quantity = 1,
            UnitValue = 10.0m,
            Weight = 0.5m,
            WeightUnit = LastMile.TMS.Domain.Enums.WeightUnit.Kg,
            OriginCountryCode = countryCode ?? string.Empty
        };

        // Act
        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(item, new ValidationContext(item), validationResults, true);

        // Assert
        isValid.Should().Be(expectedIsValid);
        if (!expectedIsValid)
        {
            validationResults.Should().Contain(r => r.MemberNames.Contains(nameof(ParcelContentItem.OriginCountryCode)));
        }
    }
}