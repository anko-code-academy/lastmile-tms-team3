namespace LastMile.TMS.Application.Features.Depots.DTOs;

public record DayOffDto(
    DateOnly Date,
    bool IsPaid,
    string? Reason
);
