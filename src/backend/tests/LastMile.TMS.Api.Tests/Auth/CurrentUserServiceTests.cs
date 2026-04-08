using System.Security.Claims;
using FluentAssertions;
using LastMile.TMS.Application.Common.Security;
using LastMile.TMS.Infrastructure.Services;
using Microsoft.AspNetCore.Http;

namespace LastMile.TMS.Api.Tests.Auth;

public class CurrentUserServiceTests
{
    [Fact]
    public void AssignedDepotId_ReadsValueFromCustomClaim()
    {
        var depotId = Guid.NewGuid();
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(CustomClaims.AssignedDepotId, depotId.ToString())
                ], "Test"))
            }
        };

        var currentUserService = new CurrentUserService(accessor);

        currentUserService.AssignedDepotId.Should().Be(depotId);
    }
}