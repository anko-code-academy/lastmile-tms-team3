using HotChocolate.Authorization;
using HotChocolate.Types;
using LastMile.TMS.Application.Users.Dtos;
using LastMile.TMS.Application.Users.Queries.GetUsers;
using LastMile.TMS.Domain.Enums;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
[Authorize(Roles = new[] { "Admin" })]
public class UserQuery
{
    public Task<List<UserDto>> GetUsersAsync(
        string? search,
        UserRole? role,
        [Service] ISender sender,
        CancellationToken cancellationToken)
        => sender.Send(new GetUsersQuery(search, role), cancellationToken);
}
