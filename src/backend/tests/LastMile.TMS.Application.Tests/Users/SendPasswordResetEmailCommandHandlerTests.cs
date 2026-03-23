using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Commands.SendPasswordResetEmail;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Users;

public class SendPasswordResetEmailCommandHandlerTests
{
    private readonly IIdentityService _identityService = Substitute.For<IIdentityService>();
    private readonly IEmailSender _emailSender = Substitute.For<IEmailSender>();
    private readonly SendPasswordResetEmailCommandHandler _handler;

    public SendPasswordResetEmailCommandHandlerTests()
    {
        _handler = new SendPasswordResetEmailCommandHandler(_identityService, _emailSender);
    }

    [Fact]
    public async Task Handle_Generates_Token_And_Sends_Email()
    {
        var userId = Guid.NewGuid();
        const string email = "user@example.com";
        const string token = "reset-token-abc";

        _identityService.GeneratePasswordResetTokenAsync(userId, Arg.Any<CancellationToken>())
            .Returns((true, email, token));

        await _handler.Handle(new SendPasswordResetEmailCommand(userId), CancellationToken.None);

        await _emailSender.Received(1)
            .SendPasswordResetEmailAsync(email, token, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_Throws_KeyNotFoundException_When_User_Not_Found()
    {
        var userId = Guid.NewGuid();
        _identityService.GeneratePasswordResetTokenAsync(userId, Arg.Any<CancellationToken>())
            .Returns((false, string.Empty, string.Empty));

        var act = async () => await _handler.Handle(
            new SendPasswordResetEmailCommand(userId), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
