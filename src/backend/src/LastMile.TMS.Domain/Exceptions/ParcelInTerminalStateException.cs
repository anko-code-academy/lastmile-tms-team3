using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Exceptions;

public class ParcelInTerminalStateException : Exception
{
    public ParcelStatus Status { get; }

    public ParcelInTerminalStateException(ParcelStatus status)
        : base($"Parcel is in terminal state {status} and cannot be modified")
    {
        Status = status;
    }
}