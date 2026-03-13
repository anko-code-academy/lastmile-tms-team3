using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using Xunit;

namespace LastMile.TMS.Domain.Tests.Entities;

public class AddressTests
{
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
    public void CountryCode_WithVariousInputs_ShouldValidateCorrectly(string? countryCode, bool expectedIsValid)
    {
        // Arrange
        var address = new Address
        {
            Street1 = "123 Main St",
            City = "City",
            State = "State",
            PostalCode = "12345",
            CountryCode = countryCode ?? string.Empty
        };

        // Act
        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(address, new ValidationContext(address), validationResults, true);

        // Assert
        isValid.Should().Be(expectedIsValid);
        if (!expectedIsValid)
        {
            validationResults.Should().Contain(r => r.MemberNames.Contains(nameof(Address.CountryCode)));
        }
    }
}