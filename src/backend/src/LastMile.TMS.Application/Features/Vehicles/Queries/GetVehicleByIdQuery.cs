using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Vehicles.Queries;

public static class GetVehicleById
{
    public record Query(Guid Id) : IRequest<VehicleDto?>;

    public class Handler : IRequestHandler<Query, VehicleDto?>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleDto?> Handle(Query request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

            return vehicle is null ? null : VehicleMapper.ToDto(vehicle);
        }
    }
}
