using LastMile.TMS.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace LastMile.TMS.Persistence.Identity;

public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public Guid? AssignedZoneId { get; set; }
    public Guid? AssignedDepotId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTimeOffset? LastModifiedAt { get; set; }
    public string? LastModifiedBy { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();
}
