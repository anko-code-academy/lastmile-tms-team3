using System.Text;
using LastMile.TMS.Application.Common.DTOs;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Queries;

public static class SearchParcels
{
    public record Query(SearchParcelDto Input) : IRequest<PagedResultDto<ParcelListItemDto>>;

    public class Handler : IRequestHandler<Query, PagedResultDto<ParcelListItemDto>>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<PagedResultDto<ParcelListItemDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var input = request.Input;

            var query = context.Parcels
                .Include(p => p.RecipientAddress)
                .Include(p => p.ShipperAddress)
                .Include(p => p.Zone)
                .AsQueryable();

            // Full-text search
            if (!string.IsNullOrWhiteSpace(input.Search))
            {
                var search = input.Search.ToLower();
                query = query.Where(p =>
                    p.TrackingNumber.ToLower().Contains(search) ||
                    (p.RecipientAddress.ContactName != null && p.RecipientAddress.ContactName.ToLower().Contains(search)) ||
                    (p.RecipientAddress.CompanyName != null && p.RecipientAddress.CompanyName.ToLower().Contains(search)) ||
                    p.RecipientAddress.Street1.ToLower().Contains(search) ||
                    (p.RecipientAddress.Street2 != null && p.RecipientAddress.Street2.ToLower().Contains(search)) ||
                    p.RecipientAddress.City.ToLower().Contains(search) ||
                    (p.ShipperAddress.ContactName != null && p.ShipperAddress.ContactName.ToLower().Contains(search)) ||
                    (p.ShipperAddress.CompanyName != null && p.ShipperAddress.CompanyName.ToLower().Contains(search)) ||
                    p.ShipperAddress.Street1.ToLower().Contains(search) ||
                    p.ShipperAddress.City.ToLower().Contains(search));
            }

            // Status filter
            if (input.Status != null && input.Status.Length > 0)
            {
                query = query.Where(p => input.Status.Contains(p.Status));
            }

            // Date range filter
            if (input.DateFrom.HasValue)
            {
                query = query.Where(p => p.CreatedAt >= input.DateFrom.Value);
            }

            if (input.DateTo.HasValue)
            {
                query = query.Where(p => p.CreatedAt <= input.DateTo.Value);
            }

            // Zone filter
            if (input.ZoneId.HasValue)
            {
                query = query.Where(p => p.ZoneId == input.ZoneId.Value);
            }

            // Parcel type filter
            if (!string.IsNullOrWhiteSpace(input.ParcelType))
            {
                query = query.Where(p => p.ParcelType == input.ParcelType);
            }

            // Total count before pagination
            var totalCount = await query.CountAsync(cancellationToken);

            // Decode cursor and apply filter if valid for this sort
            CursorData? cursor = null;
            if (!string.IsNullOrWhiteSpace(input.Cursor))
            {
                cursor = DecodeCursor(input.Cursor);
                if (cursor != null && cursor.SortBy == input.SortBy)
                {
                    query = ApplyCursorFilter(query, cursor, input.SortBy, input.SortDirection);
                }
                else
                {
                    cursor = null;
                }
            }

            // Apply sorting
            query = ApplySort(query, input.SortBy, input.SortDirection);

            // Fetch one extra to determine HasNextPage
            var pageSize = Math.Min(Math.Max(1, input.PageSize), 100);
            var items = await query
                .Take(pageSize + 1)
                .ToListAsync(cancellationToken);

            var hasNextPage = items.Count > pageSize;
            if (hasNextPage)
            {
                items.RemoveAt(items.Count - 1);
            }

            var dtos = items.Select(MapToListItemDto).ToList();

            string? nextCursor = null;
            string? previousCursor = null;

            if (items.Count > 0)
            {
                var lastItem = items[^1];
                var firstItem = items[0];

                nextCursor = EncodeCursor(firstItem, input.SortBy, input.SortDirection, isNext: true);
                previousCursor = EncodeCursor(lastItem, input.SortBy, input.SortDirection, isNext: false);
            }

            return new PagedResultDto<ParcelListItemDto>(
                dtos,
                totalCount,
                hasNextPage,
                !string.IsNullOrEmpty(input.Cursor),
                nextCursor,
                previousCursor
            );
        }

        private static IQueryable<Domain.Entities.Parcel> ApplySort(
            IQueryable<Domain.Entities.Parcel> query,
            ParcelSortBy sortBy,
            SortDirection direction)
        {
            var isAsc = direction == SortDirection.Asc;

            return sortBy switch
            {
                ParcelSortBy.TrackingNumber => isAsc
                    ? query.OrderBy(p => p.TrackingNumber).ThenBy(p => p.Id)
                    : query.OrderByDescending(p => p.TrackingNumber).ThenByDescending(p => p.Id),
                ParcelSortBy.RecipientName => isAsc
                    ? query.OrderBy(p => p.RecipientAddress.ContactName).ThenBy(p => p.Id)
                    : query.OrderByDescending(p => p.RecipientAddress.ContactName).ThenByDescending(p => p.Id),
                ParcelSortBy.Status => isAsc
                    ? query.OrderBy(p => p.Status).ThenBy(p => p.Id)
                    : query.OrderByDescending(p => p.Status).ThenByDescending(p => p.Id),
                _ => isAsc
                    ? query.OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
                    : query.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id),
            };
        }

        private static IQueryable<Domain.Entities.Parcel> ApplyCursorFilter(
            IQueryable<Domain.Entities.Parcel> query,
            CursorData cursor,
            ParcelSortBy sortBy,
            SortDirection direction)
        {
            var isNext = direction == SortDirection.Asc ? cursor.IsFromAscending : !cursor.IsFromAscending;

            return sortBy switch
            {
                ParcelSortBy.TrackingNumber => isNext
                    ? query.Where(p =>
                        string.Compare(p.TrackingNumber, cursor.SortValue) > 0 ||
                        (p.TrackingNumber == cursor.SortValue && p.Id.CompareTo(cursor.Id) > 0))
                    : query.Where(p =>
                        string.Compare(p.TrackingNumber, cursor.SortValue) < 0 ||
                        (p.TrackingNumber == cursor.SortValue && p.Id.CompareTo(cursor.Id) < 0)),
                ParcelSortBy.RecipientName => isNext
                    ? query.Where(p =>
                        string.Compare(p.RecipientAddress.ContactName ?? "", cursor.SortValue) > 0 ||
                        (p.RecipientAddress.ContactName == cursor.SortValue && p.Id.CompareTo(cursor.Id) > 0))
                    : query.Where(p =>
                        string.Compare(p.RecipientAddress.ContactName ?? "", cursor.SortValue) < 0 ||
                        (p.RecipientAddress.ContactName == cursor.SortValue && p.Id.CompareTo(cursor.Id) < 0)),
                ParcelSortBy.Status => isNext
                    ? query.Where(p => p.Status > cursor.StatusValue ||
                        (p.Status == cursor.StatusValue && p.Id.CompareTo(cursor.Id) > 0))
                    : query.Where(p => p.Status < cursor.StatusValue ||
                        (p.Status == cursor.StatusValue && p.Id.CompareTo(cursor.Id) < 0)),
                _ => isNext
                    ? query.Where(p =>
                        p.CreatedAt > cursor.CreatedAt ||
                        (p.CreatedAt == cursor.CreatedAt && p.Id.CompareTo(cursor.Id) > 0))
                    : query.Where(p =>
                        p.CreatedAt < cursor.CreatedAt ||
                        (p.CreatedAt == cursor.CreatedAt && p.Id.CompareTo(cursor.Id) < 0)),
            };
        }

        private static string EncodeCursor(
            Domain.Entities.Parcel item,
            ParcelSortBy sortBy,
            SortDirection direction,
            bool isNext)
        {
            var sortValue = sortBy switch
            {
                ParcelSortBy.TrackingNumber => item.TrackingNumber,
                ParcelSortBy.RecipientName => item.RecipientAddress.ContactName ?? "",
                ParcelSortBy.Status => item.Status.ToString(),
                _ => item.CreatedAt.Ticks.ToString(),
            };

            var raw = $"{(int)sortBy}|{sortValue.Replace("|", "_")}|{item.Id}|{(direction == SortDirection.Asc)}|{isNext}";
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));
        }

        private static CursorData? DecodeCursor(string encoded)
        {
            try
            {
                var raw = Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
                var parts = raw.Split('|');
                if (parts.Length != 5) return null;

                var sortBy = (ParcelSortBy)int.Parse(parts[0]);
                var sortValue = parts[1];
                var id = Guid.Parse(parts[2]);
                var isFromAscending = bool.Parse(parts[3]);
                var nextIsForward = bool.Parse(parts[4]);

                var createdAt = sortBy == ParcelSortBy.CreatedAt
                    ? new DateTimeOffset(long.Parse(sortValue), TimeSpan.Zero)
                    : default;

                var statusValue = sortBy == ParcelSortBy.Status
                    ? (Domain.Enums.ParcelStatus)Enum.Parse(typeof(Domain.Enums.ParcelStatus), sortValue)
                    : default;

                return new CursorData(sortBy, sortValue, id, isFromAscending, nextIsForward, createdAt, statusValue);
            }
            catch
            {
                return null;
            }
        }

        private static ParcelListItemDto MapToListItemDto(Domain.Entities.Parcel p) => new(
            p.Id,
            p.TrackingNumber,
            p.Description,
            p.ServiceType,
            p.Status,
            p.RecipientAddress.ContactName ?? p.RecipientAddress.CompanyName ?? "",
            p.RecipientAddress.City,
            p.Zone?.Name,
            p.ParcelType,
            p.Weight,
            p.WeightUnit,
            p.DeclaredValue,
            p.Currency,
            p.EstimatedDeliveryDate,
            p.ContentItems.Count,
            p.CreatedAt
        );
    }

    private record CursorData(
        ParcelSortBy SortBy,
        string SortValue,
        Guid Id,
        bool IsFromAscending,
        bool NextIsForward,
        DateTimeOffset CreatedAt,
        Domain.Enums.ParcelStatus StatusValue
    );
}
