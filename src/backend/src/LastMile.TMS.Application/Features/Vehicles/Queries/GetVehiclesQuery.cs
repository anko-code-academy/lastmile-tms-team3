using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Vehicles.Queries;

public static class GetAllVehicles
{
    public record Query(Guid? DepotId = null) : IRequest<List<VehicleDto>>;

    public class Handler : IRequestHandler<Query, List<VehicleDto>>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<List<VehicleDto>> Handle(Query request, CancellationToken cancellationToken)
        {
            var query = _context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .AsQueryable();

            if (request.DepotId.HasValue)
                query = query.Where(v => v.DepotId == request.DepotId.Value);

            var vehicles = await query.ToListAsync(cancellationToken);

            return vehicles.Select(VehicleMapper.ToDto).ToList();
        }
    }
}
