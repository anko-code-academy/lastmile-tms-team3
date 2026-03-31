using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Queries;

public static class GetAllDrivers
{
    public record Query(
        Guid? DepotId = null,
        bool? IsActive = null,
        string? Search = null,
        int Page = 1,
        int PageSize = 20) : IRequest<PagedDriversResult>;

    public class Handler : IRequestHandler<Query, PagedDriversResult>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<PagedDriversResult> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var query = context.Drivers
                .Include(d => d.Depot)
                .AsQueryable();

            if (request.DepotId.HasValue)
                query = query.Where(d => d.DepotId == request.DepotId.Value);

            if (request.IsActive.HasValue)
                query = query.Where(d => d.IsActive == request.IsActive.Value);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var term = request.Search.Trim().ToLower();
                query = query.Where(d =>
                    (d.FirstName + " " + d.LastName).ToLower().Contains(term) ||
                    d.Email.ToLower().Contains(term) ||
                    d.LicenseNumber.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var page = Math.Max(1, request.Page);
            var pageSize = Math.Clamp(request.PageSize, 1, 100);

            var drivers = await query
                .OrderBy(d => d.LastName)
                .ThenBy(d => d.FirstName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return new PagedDriversResult(
                drivers.Select(DriverMapper.ToListItemDto).ToList(),
                totalCount,
                page,
                pageSize);
        }
    }
}
