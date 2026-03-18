namespace LastMile.TMS.Domain.Entities;

public record OperatingHours
{
    public List<DailyAvailability> Schedule { get; init; } = [];
    public List<DayOff> DaysOff { get; init; } = [];
}

public record DailyAvailability
{
    public string DayOfWeek { get; init; } = string.Empty;
    public TimeOnly? StartTime { get; init; }
    public TimeOnly? EndTime { get; init; }
}

public record DayOff
{
    public DateOnly Date { get; init; }
    public bool IsPaid { get; init; }
    public string? Reason { get; init; }
}