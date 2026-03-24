using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Vehicles.Commands;

public static class UpdateVehicleStatus
{
    public record Command(UpdateVehicleStatusDto Dto) : IRequest<VehicleDto>;

    public class Handler : IRequestHandler<Command, VehicleDto>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var vehicle = await _context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .FirstOrDefaultAsync(v => v.Id == request.Dto.Id, cancellationToken);

            if (vehicle is null)
                throw new InvalidOperationException($"Vehicle with ID '{request.Dto.Id}' was not found.");

            vehicle.Status = request.Dto.Status;

            await _context.SaveChangesAsync(cancellationToken);

            return VehicleMapper.ToDto(vehicle);
        }
    }
}
