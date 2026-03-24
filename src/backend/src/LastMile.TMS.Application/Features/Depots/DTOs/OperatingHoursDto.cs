namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record OperatingHoursDto(
    List<DailyAvailabilityDto> Schedule,
    List<DayOffDto> DaysOff
);
