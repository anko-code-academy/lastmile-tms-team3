using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;


public class Driver : BaseAuditableEntity
{
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string LicenseNumber { get; private set; } = string.Empty;
    public DateOnly LicenseExpiryDate { get; private set; }
    public string? PhotoUrl { get; private set; }
    public Guid? ZoneId { get; private set; }
    public Guid? DepotId { get; private set; }
    public Guid? UserId { get; private set; }
    public bool IsActive { get; private set; } = true;
    public OperatingHours Availability { get; private set; } = new();

    public string FullName => $"{FirstName} {LastName}".Trim();

    public virtual Zone? Zone { get; private set; }
    public virtual Depot? Depot { get; private set; }
    public virtual User? User { get; private set; }

    private Driver() { }

    public static Driver Create(
        string firstName,
        string lastName,
        string phone,
        string email,
        string licenseNumber,
        DateOnly licenseExpiryDate,
        string? photoUrl = null,
        Guid? zoneId = null,
        Guid? depotId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(firstName);
        ArgumentException.ThrowIfNullOrWhiteSpace(lastName);
        ArgumentException.ThrowIfNullOrWhiteSpace(phone);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(licenseNumber);

        return new Driver
        {
            Id = Guid.NewGuid(),
            FirstName = firstName,
            LastName = lastName,
            Phone = phone,
            Email = email,
            LicenseNumber = licenseNumber,
            LicenseExpiryDate = licenseExpiryDate,
            PhotoUrl = photoUrl,
            ZoneId = zoneId,
            DepotId = depotId,
            IsActive = true
        };
    }

    public void AssignZone(Guid? zoneId) => ZoneId = zoneId;

    public void AssignDepot(Guid? depotId) => DepotId = depotId;

    public void LinkUser(Guid? userId) => UserId = userId;

    public void Deactivate() => IsActive = false;

    public void Activate() => IsActive = true;

    public void UpdateLicense(string licenseNumber, DateOnly licenseExpiryDate)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(licenseNumber);
        LicenseNumber = licenseNumber;
        LicenseExpiryDate = licenseExpiryDate;
    }

    public void UpdateAvailability(OperatingHours availability)
    {
        Availability = availability ?? throw new ArgumentNullException(nameof(availability));
    }
}
