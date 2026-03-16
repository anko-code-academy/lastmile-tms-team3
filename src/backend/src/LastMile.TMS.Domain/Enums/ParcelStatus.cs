namespace LastMile.TMS.Domain.Enums;

public enum ParcelStatus
{
    Registered = 0,
    ReceivedAtDepot = 1,
    Sorted = 2,
    Staged = 3,
    Loaded = 4,
    OutForDelivery = 5,
    Delivered = 6,
    FailedAttempt = 7,
    ReturnedToDepot = 8,
    Cancelled = 9,
    Exception = 10
}