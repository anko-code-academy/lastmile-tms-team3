using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Vehicles.DTOs;
using LastMile.TMS.Application.Features.Vehicles.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Vehicles.Commands;

public static class UpdateVehicle
{
    public record Command(UpdateVehicleDto Dto) : IRequest<VehicleDto>;

    public class Handler : IRequestHandler<Command, VehicleDto>
    {
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<VehicleDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var vehicle = await context.Vehicles
                .Include(v => v.Depot)
                    .ThenInclude(d => d.Address)
                .FirstOrDefaultAsync(v => v.Id == request.Dto.Id, cancellationToken);

            if (vehicle is null)
                throw new InvalidOperationException($"Vehicle with ID '{request.Dto.Id}' was not found.");

            if (!string.IsNullOrWhiteSpace(request.Dto.RegistrationPlate))
                vehicle.RegistrationPlate = request.Dto.RegistrationPlate.Trim().ToUpperInvariant();

            if (request.Dto.ParcelCapacity.HasValue)
                vehicle.ParcelCapacity = request.Dto.ParcelCapacity.Value;

            if (request.Dto.WeightCapacity.HasValue)
                vehicle.WeightCapacity = request.Dto.WeightCapacity.Value;

            if (request.Dto.Status.HasValue)
                vehicle.Status = request.Dto.Status.Value;

            if (request.Dto.DepotId.HasValue)
                vehicle.DepotId = request.Dto.DepotId.Value;

            await context.SaveChangesAsync(cancellationToken);

            return VehicleMapper.ToDto(vehicle);
        }
    }
}
