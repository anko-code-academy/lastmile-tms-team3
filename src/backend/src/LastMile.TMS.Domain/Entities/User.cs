using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

/// <summary>
/// Domain entity representing a system user.
/// The corresponding EF/Identity entity is AppUser in the Persistence layer.
/// </summary>
public class User : BaseAuditableEntity
{
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? Phone { get; private set; }
    public UserRole Role { get; private set; }
    public Guid? AssignedZoneId { get; private set; }
    public Guid? AssignedDepotId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public string FullName => $"{FirstName} {LastName}".Trim();

    private User() { }

    public static User Create(
        string firstName,
        string lastName,
        string email,
        UserRole role,
        string? phone = null,
        Guid? zoneId = null,
        Guid? depotId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(firstName);
        ArgumentException.ThrowIfNullOrWhiteSpace(lastName);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);

        return new User
        {
            Id = Guid.NewGuid(),
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Role = role,
            Phone = phone,
            AssignedZoneId = zoneId,
            AssignedDepotId = depotId,
            IsActive = true
        };
    }

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;

    public void AssignRole(UserRole role) => Role = role;

    public void AssignZone(Guid? zoneId) => AssignedZoneId = zoneId;

    public void AssignDepot(Guid? depotId) => AssignedDepotId = depotId;
}
