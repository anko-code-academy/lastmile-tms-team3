namespace LastMile.TMS.Domain.Enums;

public enum ExceptionReason
{
    AddressNotFound = 0,
    RecipientUnavailable = 1,
    DamagedInTransit = 2,
    WeatherDelay = 3,
    CustomsHold = 4,
    RefusedByRecipient = 5,
    BadLabel = 6,
    Unidentified = 7,
    CustomerHold = 8
}