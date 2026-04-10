using FluentAssertions;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Tests.Entities;

public class UserRoleTests
{
    [Fact]
    public void UserRole_Should_Have_Seven_Predefined_Roles()
    {
        var roles = Enum.GetValues<UserRole>();
        roles.Should().HaveCount(7);
    }

    [Theory]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.OperationsManager)]
    [InlineData(UserRole.WarehouseManager)]
    [InlineData(UserRole.Dispatcher)]
    [InlineData(UserRole.WarehouseOperator)]
    [InlineData(UserRole.DepotOperator)]
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

    [Fact]
    public void UserRole_OperationsManager_Should_Have_Value_Two()
    {
        ((int)UserRole.OperationsManager).Should().Be(2);
    }

    [Fact]
    public void UserRole_Dispatcher_Should_Keep_Original_Value()
    {
        ((int)UserRole.Dispatcher).Should().Be(3);
    }

    [Fact]
    public void UserRole_WarehouseOperator_Should_Keep_Original_Value()
    {
        ((int)UserRole.WarehouseOperator).Should().Be(4);
    }

    [Fact]
    public void UserRole_Driver_Should_Keep_Original_Value()
    {
        ((int)UserRole.Driver).Should().Be(5);
    }

    [Fact]
    public void UserRole_WarehouseManager_Should_Be_Appended_At_End()
    {
        ((int)UserRole.WarehouseManager).Should().Be(6);
    }

    [Fact]
    public void UserRole_DepotOperator_Should_Have_Value_Seven()
    {
        ((int)UserRole.DepotOperator).Should().Be(7);
    }
}
