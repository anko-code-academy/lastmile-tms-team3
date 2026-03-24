using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Seeding;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Api.Tests;

public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private const string DefaultTestConnection =
        "Host=localhost;Port=5432;Database=lastmile_tms_test;Username=postgres;Password=postgres";

    private static string TestConnection =>
        Environment.GetEnvironmentVariable("TEST_DB_CONNECTION") ?? DefaultTestConnection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.UseSetting("ConnectionStrings:DefaultConnection", TestConnection);
        builder.UseSetting("ConnectionStrings:HangfireConnection", TestConnection);

        // Disable the seeder hosted service in tests - we'll run it manually after migrations
        builder.ConfigureServices(services =>
        {
            // Remove only the DbSeederHostedService (IHostedService implementation)
            // but keep IDbSeeder registered
            var hostedServiceDescriptor = services
                .FirstOrDefault(s => s.ServiceType == typeof(IHostedService) &&
                    s.ImplementationType == typeof(DbSeederHostedService));
            if (hostedServiceDescriptor != null)
                services.Remove(hostedServiceDescriptor);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = builder.Build();

        using (var scope = host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var seeder = scope.ServiceProvider.GetRequiredService<IDbSeeder>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApiWebApplicationFactory>>();

            try
            {
                logger.LogInformation("Applying database migrations...");
                db.Database.Migrate();
                logger.LogInformation("Migrations applied, now seeding...");
                seeder.SeedAsync().GetAwaiter().GetResult();
                logger.LogInformation("Database setup complete");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error during database setup");
                throw;
            }
        }

        host.Start();

        return host;
    }
}
