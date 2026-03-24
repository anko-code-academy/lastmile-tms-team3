using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Infrastructure.Services;

public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendPasswordResetEmailAsync(
        string toEmail,
        string resetToken,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Password reset requested for {Email}. Token: {Token}",
            toEmail,
            resetToken);

        return Task.CompletedTask;
    }
}
