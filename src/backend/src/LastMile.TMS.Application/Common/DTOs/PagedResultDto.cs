namespace LastMile.TMS.Application.Common.DTOs;

public record PagedResultDto<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    bool HasNextPage,
    bool HasPreviousPage,
    string? NextCursor,
    string? PreviousCursor
);
