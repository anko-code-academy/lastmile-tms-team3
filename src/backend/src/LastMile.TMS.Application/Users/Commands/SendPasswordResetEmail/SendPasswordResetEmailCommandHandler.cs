using LastMile.TMS.Application.Common.Interfaces;
using MediatR;

namespace LastMile.TMS.Application.Users.Commands.SendPasswordResetEmail;

public class SendPasswordResetEmailCommandHandler(
    IIdentityService identityService,
    IEmailSender emailSender)
    : IRequestHandler<SendPasswordResetEmailCommand>
{
    public async Task Handle(SendPasswordResetEmailCommand request, CancellationToken cancellationToken)
    {
        var (success, email, token) = await identityService.GeneratePasswordResetTokenAsync(
            request.UserId, cancellationToken);

        if (!success)
            throw new KeyNotFoundException($"User {request.UserId} not found.");

        await emailSender.SendPasswordResetEmailAsync(email, token, cancellationToken);
    }
}
