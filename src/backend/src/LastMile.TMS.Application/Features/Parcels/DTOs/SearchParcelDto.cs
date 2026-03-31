using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record SearchParcelDto(
    string? Search,
    ParcelStatus[]? Status,
    DateTimeOffset? DateFrom,
    DateTimeOffset? DateTo,
    Guid[]? ZoneIds,
    string? ParcelType,
    ParcelSortBy SortBy,
    SortDirection SortDirection,
    string? Cursor,
    int PageSize
);

public enum ParcelSortBy
{
    CreatedAt,
    TrackingNumber,
    RecipientName,
    Status
}

public enum SortDirection
{
    Asc,
    Desc
}
