using MediatR;

namespace LastMile.TMS.Application.Users.Commands.SendPasswordResetEmail;

public record SendPasswordResetEmailCommand(Guid UserId) : IRequest;
