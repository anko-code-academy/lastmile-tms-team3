using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Depots.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Depots.Queries;

public static class GetAllDepots
{
    public record Query(bool? IncludeInactive = null) : IRequest<List<DepotDto>>;

    public class Handler : IRequestHandler<Query, List<DepotDto>>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<List<DepotDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var query = context.Depots
                .Include(d => d.Address)
                .AsQueryable();

            if (request.IncludeInactive != true)
            {
                query = query.Where(d => d.IsActive);
            }

            var depots = await query.ToListAsync(cancellationToken);

            return depots.Select(MapToDto).ToList();
        }

        private static DepotDto MapToDto(Domain.Entities.Depot depot) => new(
            depot.Id,
            depot.Name,
            new AddressDto(
                depot.Address.Street1,
                depot.Address.Street2,
                depot.Address.City,
                depot.Address.State,
                depot.Address.PostalCode,
                depot.Address.CountryCode,
                depot.Address.IsResidential,
                depot.Address.ContactName,
                depot.Address.CompanyName,
                depot.Address.Phone,
                depot.Address.Email,
                depot.Address.GeoLocation?.Y,
                depot.Address.GeoLocation?.X
            ),
            depot.IsActive,
            new OperatingHoursDto(
                depot.OperatingHours.Schedule.Select(s => new DailyAvailabilityDto(s.DayOfWeek, s.StartTime?.ToString("HH:mm:ss"), s.EndTime?.ToString("HH:mm:ss"))).ToList(),
                depot.OperatingHours.DaysOff.Select(d => new DayOffDto(d.Date, d.IsPaid, d.Reason)).ToList()
            ),
            depot.CreatedAt,
            depot.LastModifiedAt
        );
    }
}
