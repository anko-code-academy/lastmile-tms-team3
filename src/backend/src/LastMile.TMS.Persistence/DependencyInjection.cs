using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Persistence.Identity;
using LastMile.TMS.Persistence.Seeding;
using LastMile.TMS.Persistence.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddPooledDbContextFactory<AppDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql =>
                {
                    npgsql.UseNetTopologySuite();
                    npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
                })
                .LogTo(Console.WriteLine, LogLevel.Information)
                .EnableSensitiveDataLogging());

        services.AddScoped<IAppDbContextFactory, AppDbContextFactory>();

        services.AddIdentity<AppUser, AppRole>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequiredLength = 8;
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IDbSeeder, ApplicationDbSeeder>();
        services.AddHostedService<DbSeederHostedService>();
        services.AddScoped<IIdentityService, IdentityService>();

        return services;
    }
}
