using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Queries;

public static class GetAllDrivers
{
    public record Query(Guid? DepotId = null, bool? IsActive = null) : IRequest<List<DriverDto>>;

    public class Handler : IRequestHandler<Query, List<DriverDto>>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<List<DriverDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            var query = _context.Drivers
                .Include(d => d.Depot)
                .Include(d => d.Zone)
                .AsQueryable();

            if (request.DepotId.HasValue)
                query = query.Where(d => d.DepotId == request.DepotId.Value);

            if (request.IsActive.HasValue)
                query = query.Where(d => d.IsActive == request.IsActive.Value);

            var drivers = await query.ToListAsync(cancellationToken);

            return drivers.Select(DriverMapper.ToDto).ToList();
        }
    }
}
