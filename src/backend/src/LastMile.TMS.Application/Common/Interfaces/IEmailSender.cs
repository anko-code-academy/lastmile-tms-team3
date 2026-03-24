namespace LastMile.TMS.Application.Common.Interfaces;

public interface IEmailSender
{
    Task SendPasswordResetEmailAsync(
        string toEmail,
        string resetToken,
        CancellationToken cancellationToken = default);
}
