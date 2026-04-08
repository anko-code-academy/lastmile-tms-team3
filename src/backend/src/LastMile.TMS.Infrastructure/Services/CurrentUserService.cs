using System.Security.Claims;
using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace LastMile.TMS.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public string? UserId =>
        User?.FindFirstValue("sub") ??
        User?.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? UserName =>
        User?.FindFirstValue("name") ??
        User?.FindFirstValue(ClaimTypes.Name);

    public Guid? AssignedDepotId
    {
        get
        {
            var claimValue = User?.FindFirstValue("assigned_depot_id");
            return Guid.TryParse(claimValue, out var depotId) ? depotId : null;
        }
    }

    public bool IsInRole(string role) => User?.IsInRole(role) == true;
}
