using LastMile.TMS.Application.Common.Interfaces;

namespace LastMile.TMS.Application.Common.Security;

internal static class DepotAccessGuard
{
    public static void EnsureDepotAccess(ICurrentUserService currentUser, Guid depotId)
    {
        if (currentUser.IsInRole("Admin"))
            return;

        if (!currentUser.IsInRole("DepotOperator") || currentUser.AssignedDepotId != depotId)
            throw new UnauthorizedAccessException("You are not allowed to perform operations for this depot.");
    }
}
