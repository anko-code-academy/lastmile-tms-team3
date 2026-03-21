using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record DepotDto(
    Guid Id,
    string Name,
    AddressDto Address,
    bool IsActive,
    OperatingHoursDto OperatingHours,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastModifiedAt
);

public record CreateDepotDto(
    string Name,
    CreateAddressDto Address,
    bool IsActive = true,
    OperatingHoursDto? OperatingHours = null
);

public record UpdateDepotDto(
    Guid Id,
    string Name,
    CreateAddressDto Address,
    bool IsActive,
    OperatingHoursDto? OperatingHours
);

public record AddressDto(
    string Street1,
    string? Street2,
    string City,
    string State,
    string PostalCode,
    string CountryCode,
    bool IsResidential,
    string? ContactName,
    string? CompanyName,
    string? Phone,
    string? Email,
    double? Latitude,
    double? Longitude
);

public record CreateAddressDto(
    string Street1,
    string? Street2,
    string City,
    string State,
    string PostalCode,
    string CountryCode,
    bool IsResidential = false,
    string? ContactName = null,
    string? CompanyName = null,
    string? Phone = null,
    string? Email = null,
    double? Latitude = null,
    double? Longitude = null
);

public record OperatingHoursDto(
    List<DailyAvailabilityDto> Schedule,
    List<DayOffDto> DaysOff
);

public record DailyAvailabilityDto(
    string DayOfWeek,
    TimeOnly? StartTime,
    TimeOnly? EndTime
);

public record DayOffDto(
    DateOnly Date,
    bool IsPaid,
    string? Reason
);