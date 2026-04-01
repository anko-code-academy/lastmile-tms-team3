namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record DailyAvailabilityDto(
    string DayOfWeek,
    string? StartTime,
    string? EndTime
);
