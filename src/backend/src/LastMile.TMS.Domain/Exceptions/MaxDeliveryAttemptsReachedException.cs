namespace LastMile.TMS.Domain.Exceptions;

public class MaxDeliveryAttemptsReachedException : Exception
{
    public int MaxAttempts { get; }

    public MaxDeliveryAttemptsReachedException(int maxAttempts)
        : base($"Maximum delivery attempts ({maxAttempts}) reached")
    {
        MaxAttempts = maxAttempts;
    }
}