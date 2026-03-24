using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Dtos;
using LastMile.TMS.Application.Users.Queries.GetUsers;
using LastMile.TMS.Domain.Enums;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Users;

public class GetUsersQueryHandlerTests
{
    private readonly IIdentityService _identityService = Substitute.For<IIdentityService>();
    private readonly GetUsersQueryHandler _handler;

    public GetUsersQueryHandlerTests()
    {
        _handler = new GetUsersQueryHandler(_identityService);
    }

    [Fact]
    public async Task Handle_Returns_All_Users_When_No_Filter()
    {
        var users = new List<UserDto>
        {
            new(Guid.NewGuid(), "Alice", "Smith", "alice@example.com", null, UserRole.Dispatcher, true, null, null, DateTimeOffset.UtcNow),
            new(Guid.NewGuid(), "Bob", "Jones", "bob@example.com", null, UserRole.Driver, true, null, null, DateTimeOffset.UtcNow)
        };
        _identityService.GetUsersAsync(null, null, Arg.Any<CancellationToken>()).Returns(users);

        var result = await _handler.Handle(new GetUsersQuery(null, null), CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Handle_Passes_SearchTerm_And_Role_To_Service()
    {
        _identityService.GetUsersAsync("alice", UserRole.Dispatcher, Arg.Any<CancellationToken>())
            .Returns(new List<UserDto>());

        await _handler.Handle(new GetUsersQuery("alice", UserRole.Dispatcher), CancellationToken.None);

        await _identityService.Received(1)
            .GetUsersAsync("alice", UserRole.Dispatcher, Arg.Any<CancellationToken>());
    }
}
