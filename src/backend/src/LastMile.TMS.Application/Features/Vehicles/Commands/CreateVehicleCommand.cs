using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Vehicles.Commands;

public static class CreateVehicle
{
    public record Command(CreateVehicleDto Dto) : IRequest<VehicleDto>;

    public class Handler : IRequestHandler<Command, VehicleDto>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<VehicleDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var depot = await _context.Depots
                .FirstOrDefaultAsync(d => d.Id == request.Dto.DepotId, cancellationToken);

            if (depot is null)
                throw new InvalidOperationException($"Depot with ID '{request.Dto.DepotId}' was not found.");

            var vehicle = new Vehicle
            {
                Id = Guid.NewGuid(),
                RegistrationPlate = request.Dto.RegistrationPlate.Trim().ToUpperInvariant(),
                Type = request.Dto.Type,
                Status = VehicleStatus.Available,
                ParcelCapacity = request.Dto.ParcelCapacity,
                WeightCapacity = request.Dto.WeightCapacity,
                WeightUnit = request.Dto.WeightUnit,
                DepotId = request.Dto.DepotId,
                Depot = depot,
                CreatedAt = DateTimeOffset.UtcNow
            };

            _context.Vehicles.Add(vehicle);
            await _context.SaveChangesAsync(cancellationToken);

            var loadedVehicle = await _context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .FirstAsync(v => v.Id == vehicle.Id, cancellationToken);

            return VehicleMapper.ToDto(loadedVehicle);
        }
    }
}
