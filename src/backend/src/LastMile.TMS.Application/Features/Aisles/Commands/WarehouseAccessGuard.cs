using LastMile.TMS.Application.Common.Interfaces;

namespace LastMile.TMS.Application.Features.Aisles.Commands;

internal static class WarehouseAccessGuard
{
    public static void EnsureDepotAccess(ICurrentUserService currentUser, Guid depotId)
    {
        if (currentUser.IsInRole("Admin") || currentUser.IsInRole("OperationsManager"))
            return;

        if (!currentUser.IsInRole("WarehouseManager") || currentUser.AssignedDepotId != depotId)
            throw new UnauthorizedAccessException("You are not allowed to manage warehouse aisles for this depot.");
    }
}