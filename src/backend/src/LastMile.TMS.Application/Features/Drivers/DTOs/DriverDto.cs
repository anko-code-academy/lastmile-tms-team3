namespace LastMile.TMS.Application.Features.Drivers.DTOs;

public record PagedDriversResult(
    List<DriverListItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}

public record UpdateDriverAvailabilityDto(
    Guid Id,
    List<DriverScheduleInputDto> Schedule,
    List<DriverDayOffInputDto> DaysOff
);

public record DriverScheduleInputDto(
    string DayOfWeek,
    TimeOnly? StartTime,
    TimeOnly? EndTime
);

public record DriverDayOffInputDto(
    DateOnly Date,
    bool IsPaid,
    string? Reason
);

public record DriverListItemDto(
    Guid Id,
    string FullName,
    string Email,
    string LicenseNumber,
    string? DepotName,
    bool IsActive,
    DateTimeOffset CreatedAt
);

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
