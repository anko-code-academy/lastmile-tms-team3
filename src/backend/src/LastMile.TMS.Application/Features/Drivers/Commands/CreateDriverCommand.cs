using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using LastMile.TMS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Commands;

public static class CreateDriver
{
    public record Command(CreateDriverDto Dto) : IRequest<DriverDto>;

    public class Handler : IRequestHandler<Command, DriverDto>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<DriverDto> Handle(Command request, CancellationToken cancellationToken)
        {
            if (request.Dto.DepotId.HasValue)
            {
                var depot = await _context.Depots
                    .FirstOrDefaultAsync(d => d.Id == request.Dto.DepotId.Value, cancellationToken);

                if (depot is null)
                    throw new InvalidOperationException($"Depot with ID '{request.Dto.DepotId}' was not found.");
            }

            var driver = Driver.Create(
                request.Dto.FirstName,
                request.Dto.LastName,
                request.Dto.Phone,
                request.Dto.Email,
                request.Dto.LicenseNumber,
                request.Dto.LicenseExpiryDate,
                request.Dto.PhotoUrl,
                request.Dto.ZoneId,
                request.Dto.DepotId);

            _context.Drivers.Add(driver);
            await _context.SaveChangesAsync(cancellationToken);

            var loaded = await _context.Drivers
                .Include(d => d.Depot)
                .Include(d => d.Zone)
                .FirstAsync(d => d.Id == driver.Id, cancellationToken);

            return DriverMapper.ToDto(loaded);
        }
    }
}
