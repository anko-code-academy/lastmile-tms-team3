using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Users.Dtos;

public record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    UserRole Role,
    bool IsActive,
    Guid? AssignedZoneId,
    Guid? AssignedDepotId,
    DateTimeOffset CreatedAt);
