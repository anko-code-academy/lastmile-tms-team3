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
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<VehicleDto?> Handle(Query request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var vehicle = await context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

            return vehicle is null ? null : VehicleMapper.ToDto(vehicle);
        }
    }
}
