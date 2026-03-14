using System.Security.Claims;
using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace LastMile.TMS.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public string? UserId =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? UserName =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);
}
