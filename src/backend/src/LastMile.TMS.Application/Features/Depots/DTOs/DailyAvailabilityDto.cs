namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record DailyAvailabilityDto(
    string DayOfWeek,
    TimeOnly? StartTime,
    TimeOnly? EndTime
);
