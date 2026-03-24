using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Commands.DeactivateUser;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Users;

public class DeactivateUserCommandHandlerTests
{
    private readonly IIdentityService _identityService = Substitute.For<IIdentityService>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly DeactivateUserCommandHandler _handler;

    public DeactivateUserCommandHandlerTests()
    {
        _handler = new DeactivateUserCommandHandler(_identityService, _currentUserService);
    }

    [Fact]
    public async Task Handle_Deactivates_User_Successfully()
    {
        var userId = Guid.NewGuid();
        _identityService.DeactivateUserAsync(userId, Arg.Any<CancellationToken>()).Returns(true);

        var act = async () => await _handler.Handle(new DeactivateUserCommand(userId), CancellationToken.None);

        await act.Should().NotThrowAsync();
        await _identityService.Received(1).DeactivateUserAsync(userId, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_Throws_KeyNotFoundException_When_User_Not_Found()
    {
        var userId = Guid.NewGuid();
        _identityService.DeactivateUserAsync(userId, Arg.Any<CancellationToken>()).Returns(false);

        var act = async () => await _handler.Handle(new DeactivateUserCommand(userId), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Handle_Throws_InvalidOperationException_When_Admin_Deactivates_Themselves()
    {
        var userId = Guid.NewGuid();
        _currentUserService.UserId.Returns(userId.ToString());

        var act = async () => await _handler.Handle(new DeactivateUserCommand(userId), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _identityService.DidNotReceive().DeactivateUserAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
