using Microsoft.AspNetCore.Identity;

namespace LastMile.TMS.Persistence.Identity;

public class AppRole : IdentityRole<Guid>
{
    public AppRole() { }

    public AppRole(string roleName) : base(roleName) { }
}
