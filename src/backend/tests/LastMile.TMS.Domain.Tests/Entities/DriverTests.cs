using FluentAssertions;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Domain.Tests.Entities;

public class DriverTests
{
    [Fact]
    public void Create_Should_Return_Active_Driver_With_Correct_Properties()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        driver.FirstName.Should().Be("John");
        driver.LastName.Should().Be("Doe");
        driver.Phone.Should().Be("+1234567890");
        driver.Email.Should().Be("john@example.com");
        driver.LicenseNumber.Should().Be("DL123456");
        driver.IsActive.Should().BeTrue();
        driver.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void Create_Should_Set_Optional_Properties()
    {
        var zoneId = Guid.NewGuid();
        var depotId = Guid.NewGuid();
        var photoUrl = "https://example.com/photo.jpg";

        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            photoUrl,
            zoneId,
            depotId);

        driver.PhotoUrl.Should().Be(photoUrl);
        driver.ZoneId.Should().Be(zoneId);
        driver.DepotId.Should().Be(depotId);
    }

    [Fact]
    public void FullName_Should_Concatenate_FirstName_And_LastName()
    {
        var driver = Driver.Create(
            "Jane",
            "Smith",
            "+1234567890",
            "jane@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        driver.FullName.Should().Be("Jane Smith");
    }

    [Fact]
    public void Deactivate_Should_Set_IsActive_To_False()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        driver.Deactivate();

        driver.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_Should_Set_IsActive_To_True_After_Deactivation()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        driver.Deactivate();

        driver.Activate();

        driver.IsActive.Should().BeTrue();
    }

    [Fact]
    public void AssignZone_Should_Update_ZoneId()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        var zoneId = Guid.NewGuid();

        driver.AssignZone(zoneId);

        driver.ZoneId.Should().Be(zoneId);
    }

    [Fact]
    public void AssignDepot_Should_Update_DepotId()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        var depotId = Guid.NewGuid();

        driver.AssignDepot(depotId);

        driver.DepotId.Should().Be(depotId);
    }

    [Fact]
    public void LinkUser_Should_Update_UserId()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        var userId = Guid.NewGuid();

        driver.LinkUser(userId);

        driver.UserId.Should().Be(userId);
    }

    [Fact]
    public void UpdateLicense_Should_Update_LicenseInfo()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        var newExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));

        driver.UpdateLicense("DL999999", newExpiry);

        driver.LicenseNumber.Should().Be("DL999999");
        driver.LicenseExpiryDate.Should().Be(newExpiry);
    }

    [Theory]
    [InlineData("", "Doe", "+1234567890", "email@x.com", "DL123")]
    [InlineData("John", "", "+1234567890", "email@x.com", "DL123")]
    [InlineData("John", "Doe", "", "email@x.com", "DL123")]
    [InlineData("John", "Doe", "+1234567890", "", "DL123")]
    [InlineData("John", "Doe", "+1234567890", "email@x.com", "")]
    public void Create_Should_Throw_When_Required_Fields_Are_Empty(
        string firstName, string lastName, string phone, string email, string licenseNumber)
    {
        var act = () => Driver.Create(
            firstName, lastName, phone, email, licenseNumber, DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateAvailability_Should_Update_Availability()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));
        var availability = new DriverAvailability
        {
            ShiftStart = new TimeOnly(8, 0),
            ShiftEnd = new TimeOnly(17, 0),
            DaysOff = new[] { DayOfWeek.Saturday, DayOfWeek.Sunday }
        };

        driver.UpdateAvailability(availability);

        driver.Availability.ShiftStart.Should().Be(new TimeOnly(8, 0));
        driver.Availability.ShiftEnd.Should().Be(new TimeOnly(17, 0));
        driver.Availability.DaysOff.Should().Contain(DayOfWeek.Saturday);
        driver.Availability.DaysOff.Should().Contain(DayOfWeek.Sunday);
    }

    [Fact]
    public void UpdateAvailability_Should_Throw_When_Null()
    {
        var driver = Driver.Create(
            "John",
            "Doe",
            "+1234567890",
            "john@example.com",
            "DL123456",
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)));

        var act = () => driver.UpdateAvailability(null!);

        act.Should().Throw<ArgumentNullException>();
    }
}