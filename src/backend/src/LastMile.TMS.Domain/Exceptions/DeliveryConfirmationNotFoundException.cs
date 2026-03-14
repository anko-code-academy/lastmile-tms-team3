namespace LastMile.TMS.Domain.Exceptions;

public class DeliveryConfirmationNotFoundException : Exception
{
    public Guid DeliveryConfirmationId { get; }

    public DeliveryConfirmationNotFoundException(Guid deliveryConfirmationId)
        : base($"Delivery confirmation with ID '{deliveryConfirmationId}' not found")
    {
        DeliveryConfirmationId = deliveryConfirmationId;
    }
}