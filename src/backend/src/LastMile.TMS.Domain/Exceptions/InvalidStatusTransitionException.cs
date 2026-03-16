using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Exceptions;

public class InvalidStatusTransitionException : Exception
{
    public ParcelStatus FromStatus { get; }
    public ParcelStatus ToStatus { get; }

    public InvalidStatusTransitionException(ParcelStatus fromStatus, ParcelStatus toStatus)
        : base($"Invalid status transition from {fromStatus} to {toStatus}")
    {
        FromStatus = fromStatus;
        ToStatus = toStatus;
    }
}