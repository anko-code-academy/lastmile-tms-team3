using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Queries;

public static class GetAvailableDrivers
{
    public record Query(DateOnly Date) : IRequest<IReadOnlyList<AvailableDriverDto>>;

    public class Handler : IRequestHandler<Query, IReadOnlyList<AvailableDriverDto>>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<IReadOnlyList<AvailableDriverDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var drivers = await context.Drivers
                .Where(d => d.IsActive)
                .ToListAsync(cancellationToken);

            var routeCounts = await context.DeliveryRoutes
                .Where(r => r.Date == request.Date && r.DriverId != null)
                .GroupBy(r => r.DriverId!.Value)
                .Select(g => new { DriverId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.DriverId, x => x.Count, cancellationToken);

            return drivers
                .Select(d => new AvailableDriverDto(
                    d.Id,
                    d.FullName,
                    routeCounts.GetValueOrDefault(d.Id, 0)))
                .ToList();
        }
    }
}
