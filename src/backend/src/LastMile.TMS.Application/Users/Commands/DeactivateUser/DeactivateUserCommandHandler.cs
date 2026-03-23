using LastMile.TMS.Application.Common.Interfaces;
using MediatR;

namespace LastMile.TMS.Application.Users.Commands.DeactivateUser;

public class DeactivateUserCommandHandler(IIdentityService identityService)
    : IRequestHandler<DeactivateUserCommand>
{
    public async Task Handle(DeactivateUserCommand request, CancellationToken cancellationToken)
    {
        var found = await identityService.DeactivateUserAsync(request.UserId, cancellationToken);

        if (!found)
            throw new KeyNotFoundException($"User {request.UserId} not found.");
    }
}
