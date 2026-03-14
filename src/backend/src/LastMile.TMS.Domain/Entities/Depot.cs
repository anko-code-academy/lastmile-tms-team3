using LastMile.TMS.Domain.Common;

namespace LastMile.TMS.Domain.Entities;

public class Depot : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public Address Address { get; set; } = new();
    public bool IsActive { get; set; }
    public OperatingHours OperatingHours { get; set; } = new();

    public virtual ICollection<Zone> Zones { get; set; } = new List<Zone>();
}

public record OperatingHours
{
    public TimeOnly OpenTime { get; init; }
    public TimeOnly CloseTime { get; init; }
    public DayOfWeek[] DaysOfWeek { get; init; } = [];
}