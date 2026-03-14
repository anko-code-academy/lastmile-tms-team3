namespace LastMile.TMS.Domain.Exceptions;

public class AddressNotFoundException : Exception
{
    public Guid AddressId { get; }

    public AddressNotFoundException(Guid addressId)
        : base($"Address with ID '{addressId}' not found")
    {
        AddressId = addressId;
    }
}