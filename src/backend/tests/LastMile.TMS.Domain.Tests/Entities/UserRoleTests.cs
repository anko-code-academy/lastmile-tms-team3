using FluentAssertions;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Tests.Entities;

public class UserRoleTests
{
    [Fact]
    public void UserRole_Should_Have_Five_Predefined_Roles()
    {
        var roles = Enum.GetValues<UserRole>();
        roles.Should().HaveCount(5);
    }

    [Theory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.OperationsManager)]
    [InlineData(UserRole.Dispatcher)]
    [InlineData(UserRole.WarehouseOperator)]
    [InlineData(UserRole.Driver)]
    public void UserRole_Should_Contain_Expected_Role(UserRole role)
    {
        Enum.IsDefined(role).Should().BeTrue();
    }

    [Fact]
    public void UserRole_Admin_Should_Have_Value_One()
    {
        ((int)UserRole.Admin).Should().Be(1);
    }
}
