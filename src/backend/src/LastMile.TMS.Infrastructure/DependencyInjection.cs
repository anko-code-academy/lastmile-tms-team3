using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Infrastructure.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Polly;
using Polly.Extensions.Http;
using System.Net;

namespace LastMile.TMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();

        var retryPolicy = HttpPolicyExtensions
            .HandleTransientHttpError()
            .WaitAndRetryAsync(3, retryAttempt =>
                TimeSpan.FromSeconds(Math.Pow(2, retryAttempt - 1)) +
                TimeSpan.FromMilliseconds(Random.Shared.Next(0, 500)));

        services.AddHttpClient<IGeocodingService, NominatimGeocodingService>(c =>
        {
            c.BaseAddress = new Uri("https://nominatim.openstreetmap.org/");
            c.Timeout = TimeSpan.FromSeconds(5);
            c.DefaultRequestHeaders.Add("User-Agent", "LastMileTMS/1.0 (LastMile TMS Team 3)");
        })
            .AddPolicyHandler(retryPolicy);

        services.AddHttpClient<IRouteOptimizationService, MapboxRouteOptimizationService>(c =>
        {
            c.BaseAddress = new Uri("https://api.mapbox.com/");
            c.Timeout = TimeSpan.FromSeconds(10);
        })
            .AddPolicyHandler(retryPolicy);
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IEmailSender, LoggingEmailSender>();
        services.AddScoped<ILabelService, LabelService>();
        services.AddScoped<IManifestService, ManifestService>();

        // Hangfire, SendGrid, Twilio, etc. will be registered here

        return services;
    }
}
