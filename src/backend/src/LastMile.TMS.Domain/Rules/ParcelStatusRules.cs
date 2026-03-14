using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Rules;

public static class ParcelStatusRules
{
    public const int MaxDeliveryAttempts = 3;

    private static readonly Dictionary<ParcelStatus, HashSet<ParcelStatus>> AllowedTransitions = new()
    {
        [ParcelStatus.Registered] = [ParcelStatus.ReceivedAtDepot, ParcelStatus.Cancelled, ParcelStatus.Exception],
        [ParcelStatus.ReceivedAtDepot] = [ParcelStatus.Sorted, ParcelStatus.Exception],
        [ParcelStatus.Sorted] = [ParcelStatus.Staged, ParcelStatus.Exception],
        [ParcelStatus.Staged] = [ParcelStatus.Loaded, ParcelStatus.Exception],
        [ParcelStatus.Loaded] = [ParcelStatus.OutForDelivery, ParcelStatus.Exception],
        [ParcelStatus.OutForDelivery] = [ParcelStatus.Delivered, ParcelStatus.FailedAttempt, ParcelStatus.Exception],
        [ParcelStatus.FailedAttempt] = [ParcelStatus.OutForDelivery, ParcelStatus.ReturnedToDepot, ParcelStatus.Delivered],
        [ParcelStatus.ReturnedToDepot] = [],
        [ParcelStatus.Delivered] = [],
        [ParcelStatus.Cancelled] = [],
        [ParcelStatus.Exception] = [ParcelStatus.ReturnedToDepot, ParcelStatus.Cancelled], // Exception can be resolved to return or cancel
    };

    public static readonly HashSet<ParcelStatus> TerminalStates =
    [
        ParcelStatus.Delivered,
        ParcelStatus.Cancelled,
        ParcelStatus.ReturnedToDepot
    ];

    public static readonly HashSet<ParcelStatus> ExceptionEligibleStatuses =
    [
        ParcelStatus.Registered,
        ParcelStatus.ReceivedAtDepot,
        ParcelStatus.Sorted,
        ParcelStatus.Staged,
        ParcelStatus.Loaded,
        ParcelStatus.OutForDelivery
    ];

    public static bool IsTerminal(ParcelStatus status) =>
        TerminalStates.Contains(status);

    public static bool IsExceptionEligible(ParcelStatus status) =>
        ExceptionEligibleStatuses.Contains(status);

    public static bool CanTransition(ParcelStatus from, ParcelStatus to) =>
        AllowedTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public static IReadOnlySet<ParcelStatus> GetAllowedTransitions(ParcelStatus from) =>
        AllowedTransitions.TryGetValue(from, out var allowed)
            ? allowed
            : new HashSet<ParcelStatus>();
}