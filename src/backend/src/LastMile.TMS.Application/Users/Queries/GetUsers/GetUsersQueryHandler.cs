using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Dtos;
using MediatR;

namespace LastMile.TMS.Application.Users.Queries.GetUsers;

public class GetUsersQueryHandler(IIdentityService identityService)
    : IRequestHandler<GetUsersQuery, List<UserDto>>
{
    public Task<List<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
        => identityService.GetUsersAsync(request.SearchTerm, request.Role, cancellationToken);
}
