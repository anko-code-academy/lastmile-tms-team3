using LastMile.TMS.Application.Common.Interfaces;
using MediatR;

namespace LastMile.TMS.Application.Users.Commands.CreateUser;

public class CreateUserCommandHandler(IIdentityService identityService)
    : IRequestHandler<CreateUserCommand, Guid>
{
    public async Task<Guid> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var (userId, errors) = await identityService.CreateUserAsync(
            request.FirstName,
            request.LastName,
            request.Email,
            request.Phone,
            request.Role,
            request.AssignedZoneId,
            request.AssignedDepotId,
            request.InitialPassword,
            cancellationToken);

        if (errors.Length > 0)
            throw new InvalidOperationException(string.Join("; ", errors));

        return userId;
    }
}
