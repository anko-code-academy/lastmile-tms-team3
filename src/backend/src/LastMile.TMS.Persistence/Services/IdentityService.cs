using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Users.Dtos;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Persistence.Services;

public class IdentityService(UserManager<AppUser> userManager) : IIdentityService
{
    public async Task<(Guid UserId, string[] Errors)> CreateUserAsync(
        string firstName,
        string lastName,
        string email,
        string? phone,
        UserRole role,
        Guid? zoneId,
        Guid? depotId,
        string initialPassword,
        CancellationToken cancellationToken = default)
    {
        var user = new AppUser
        {
            UserName = email,
            Email = email,
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Role = role,
            AssignedZoneId = zoneId,
            AssignedDepotId = depotId,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var result = await userManager.CreateAsync(user, initialPassword);

        if (!result.Succeeded)
            return (Guid.Empty, result.Errors.Select(e => e.Description).ToArray());

        return (user.Id, Array.Empty<string>());
    }

    public async Task<List<UserDto>> GetUsersAsync(
        string? searchTerm,
        UserRole? role,
        CancellationToken cancellationToken = default)
    {
        var query = userManager.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term) ||
                u.Email!.ToLower().Contains(term));
        }

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        return await query
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .Select(u => new UserDto(
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email!,
                u.Phone,
                u.Role,
                u.IsActive,
                u.AssignedZoneId,
                u.AssignedDepotId,
                u.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> DeactivateUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return false;

        user.IsActive = false;
        await userManager.UpdateAsync(user);
        return true;
    }

    public async Task<(bool Success, string Email, string Token)> GeneratePasswordResetTokenAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return (false, string.Empty, string.Empty);

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        return (true, user.Email!, token);
    }
}
