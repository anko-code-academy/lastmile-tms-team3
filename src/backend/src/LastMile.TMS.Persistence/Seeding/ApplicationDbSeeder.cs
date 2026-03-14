using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Persistence.Seeding;

public class ApplicationDbSeeder(
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IConfiguration configuration,
    ILogger<ApplicationDbSeeder> logger) : IDbSeeder
{
    private static readonly string[] RoleNames =
    [
        nameof(UserRole.Admin),
        nameof(UserRole.OperationsManager),
        nameof(UserRole.Dispatcher),
        nameof(UserRole.WarehouseOperator),
        nameof(UserRole.Driver)
    ];

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync();
        await SeedAdminUserAsync();
    }

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in RoleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new AppRole(roleName));
                if (result.Succeeded)
                    logger.LogInformation("Created role: {Role}", roleName);
                else
                    logger.LogError("Failed to create role {Role}: {Errors}", roleName,
                        string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    private async Task SeedAdminUserAsync()
    {
        var adminEmail = configuration["Seeding:AdminEmail"] ?? "admin@lastmile.local";
        var adminPassword = configuration["Seeding:AdminPassword"] ?? "Admin@123456";
        var adminFirstName = configuration["Seeding:AdminFirstName"] ?? "System";
        var adminLastName = configuration["Seeding:AdminLastName"] ?? "Administrator";

        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing != null)
            return;

        var admin = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            FirstName = adminFirstName,
            LastName = adminLastName,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var createResult = await userManager.CreateAsync(admin, adminPassword);
        if (!createResult.Succeeded)
        {
            logger.LogError("Failed to create admin user: {Errors}",
                string.Join(", ", createResult.Errors.Select(e => e.Description)));
            return;
        }

        var roleResult = await userManager.AddToRoleAsync(admin, nameof(UserRole.Admin));
        if (roleResult.Succeeded)
            logger.LogInformation("Admin user seeded: {Email}", adminEmail);
        else
            logger.LogError("Failed to assign Admin role: {Errors}",
                string.Join(", ", roleResult.Errors.Select(e => e.Description)));
    }
}
