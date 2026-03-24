using MediatR;

namespace LastMile.TMS.Application.Users.Commands.DeactivateUser;

public record DeactivateUserCommand(Guid UserId) : IRequest;
