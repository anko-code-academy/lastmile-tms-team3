using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LastMile.TMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();

        // Hangfire, SendGrid, Twilio, QuestPDF, etc. will be registered here

        return services;
    }
}
