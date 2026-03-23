using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Commands.CreateUser;
using LastMile.TMS.Domain.Enums;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Users;

public class CreateUserCommandHandlerTests
{
    private readonly IIdentityService _identityService = Substitute.For<IIdentityService>();
    private readonly CreateUserCommandHandler _handler;

    public CreateUserCommandHandlerTests()
    {
        _handler = new CreateUserCommandHandler(_identityService);
    }

    [Fact]
    public async Task Handle_Returns_New_UserId_On_Success()
    {
        var expectedId = Guid.NewGuid();
        _identityService.CreateUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
                Arg.Any<string?>(), Arg.Any<UserRole>(), Arg.Any<Guid?>(),
                Arg.Any<Guid?>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns((expectedId, Array.Empty<string>()));

        var command = new CreateUserCommand("Alice", "Smith", "alice@example.com",
            null, UserRole.Dispatcher, null, null, "Password1!");

        var result = await _handler.Handle(command, CancellationToken.None);

        result.Should().Be(expectedId);
    }

    [Fact]
    public async Task Handle_Throws_When_Identity_Returns_Errors()
    {
        _identityService.CreateUserAsync(
                Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
                Arg.Any<string?>(), Arg.Any<UserRole>(), Arg.Any<Guid?>(),
                Arg.Any<Guid?>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns((Guid.Empty, new[] { "DuplicateEmail" }));

        var command = new CreateUserCommand("Alice", "Smith", "alice@example.com",
            null, UserRole.Dispatcher, null, null, "Password1!");

        var act = async () => await _handler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*DuplicateEmail*");
    }
}
