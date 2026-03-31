using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Features.Drivers.Mappers;

public static class DriverMapper
{
    public static DriverListItemDto ToListItemDto(Driver driver) => new(
        driver.Id,
        driver.FullName,
        driver.Email,
        driver.LicenseNumber,
        driver.Depot?.Name,
        driver.IsActive,
        driver.CreatedAt
    );

    public static DriverDto ToDto(Driver driver) => new(
        driver.Id,
        driver.FirstName,
        driver.LastName,
        driver.FullName,
        driver.Phone,
        driver.Email,
        driver.LicenseNumber,
        driver.LicenseExpiryDate,
        driver.PhotoUrl,
        driver.ZoneId,
        driver.Zone?.Name,
        driver.DepotId,
        driver.Depot?.Name,
        driver.UserId,
        driver.IsActive,
        new DriverAvailabilityDto(
            driver.Availability.Schedule
                .Select(s => new DriverScheduleDto(s.DayOfWeek, s.StartTime, s.EndTime))
                .ToList(),
            driver.Availability.DaysOff
                .Select(d => new DriverDayOffDto(d.Date, d.IsPaid, d.Reason))
                .ToList()
        ),
        driver.CreatedAt,
        driver.LastModifiedAt
    );
}
