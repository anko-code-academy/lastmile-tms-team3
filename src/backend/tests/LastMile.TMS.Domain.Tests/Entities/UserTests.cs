using FluentAssertions;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Tests.Entities;

public class UserTests
{
    [Fact]
    public void Create_Should_Return_Active_User_With_Correct_Properties()
    {
        var user = User.Create("John", "Doe", "john@example.com", UserRole.Dispatcher);

        user.FirstName.Should().Be("John");
        user.LastName.Should().Be("Doe");
        user.Email.Should().Be("john@example.com");
        user.Role.Should().Be(UserRole.Dispatcher);
        user.IsActive.Should().BeTrue();
        user.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void FullName_Should_Concatenate_FirstName_And_LastName()
    {
        var user = User.Create("Jane", "Smith", "jane@example.com", UserRole.Driver);

        user.FullName.Should().Be("Jane Smith");
    }

    [Fact]
    public void Deactivate_Should_Set_IsActive_To_False()
    {
        var user = User.Create("John", "Doe", "john@example.com", UserRole.WarehouseOperator);

        user.Deactivate();

        user.IsActive.Should().BeFalse();
    }

    [Fact]
    public void Activate_Should_Set_IsActive_To_True_After_Deactivation()
    {
        var user = User.Create("John", "Doe", "john@example.com", UserRole.WarehouseOperator);
        user.Deactivate();

        user.Activate();

        user.IsActive.Should().BeTrue();
    }

    [Fact]
    public void AssignRole_Should_Update_Role()
    {
        var user = User.Create("John", "Doe", "john@example.com", UserRole.Driver);

        user.AssignRole(UserRole.Dispatcher);

        user.Role.Should().Be(UserRole.Dispatcher);
    }

    [Theory]
    [InlineData("", "Doe", "email@x.com")]
    [InlineData("John", "", "email@x.com")]
    [InlineData("John", "Doe", "")]
    public void Create_Should_Throw_When_Required_Fields_Are_Empty(string firstName, string lastName, string email)
    {
        var act = () => User.Create(firstName, lastName, email, UserRole.Driver);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void AssignZone_Should_Update_AssignedZoneId()
    {
        var user = User.Create("John", "Doe", "john@example.com", UserRole.Driver);
        var zoneId = Guid.NewGuid();

        user.AssignZone(zoneId);

        user.AssignedZoneId.Should().Be(zoneId);
    }
}
