using LastMile.TMS.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace LastMile.TMS.Api.Tests;

public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private const string TestConnection =
        "Host=localhost;Port=5432;Database=lastmile_tms_test;Username=postgres;Password=postgres";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.UseSetting("ConnectionStrings:DefaultConnection", TestConnection);
        builder.UseSetting("ConnectionStrings:HangfireConnection", TestConnection);
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = builder.Build();

        using (var scope = host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.Migrate();
        }

        host.Start();

        return host;
    }
}
