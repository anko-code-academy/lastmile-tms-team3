namespace LastMile.TMS.Domain.Exceptions;

public class ParcelNotFoundException : Exception
{
    public string TrackingNumber { get; }

    public ParcelNotFoundException(string trackingNumber)
        : base($"Parcel with tracking number '{trackingNumber}' not found")
    {
        TrackingNumber = trackingNumber;
    }
}