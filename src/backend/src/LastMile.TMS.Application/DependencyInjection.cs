using FluentValidation;
using LastMile.TMS.Application.Common.Behaviors;
using LastMile.TMS.Application.Services;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace LastMile.TMS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped<IZoneMatchingService, ZoneMatchingService>();

        return services;
    }
}
