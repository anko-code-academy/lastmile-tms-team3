namespace LastMile.TMS.Application.Features.Drivers.DTOs;

public record DriverDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Phone,
    string Email,
    string LicenseNumber,
    DateOnly LicenseExpiryDate,
    string? PhotoUrl,
    Guid? ZoneId,
    string? ZoneName,
    Guid? DepotId,
    string? DepotName,
    Guid? UserId,
    bool IsActive,
    DriverAvailabilityDto Availability,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);

public record DriverAvailabilityDto(
    List<DriverScheduleDto> Schedule,
    List<DriverDayOffDto> DaysOff
);

public record DriverScheduleDto(
    string DayOfWeek,
    TimeOnly? StartTime,
    TimeOnly? EndTime
);

public record DriverDayOffDto(
    DateOnly Date,
    bool IsPaid,
    string? Reason
);
