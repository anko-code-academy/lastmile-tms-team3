using LastMile.TMS.Application.Users.Dtos;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<(Guid UserId, string[] Errors)> CreateUserAsync(
        string firstName,
        string lastName,
        string email,
        string? phone,
        UserRole role,
        Guid? zoneId,
        Guid? depotId,
        string initialPassword,
        CancellationToken cancellationToken = default);

    Task<List<UserDto>> GetUsersAsync(
        string? searchTerm,
        UserRole? role,
        CancellationToken cancellationToken = default);

    Task<bool> DeactivateUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<(bool Success, string Email, string Token)> GeneratePasswordResetTokenAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
