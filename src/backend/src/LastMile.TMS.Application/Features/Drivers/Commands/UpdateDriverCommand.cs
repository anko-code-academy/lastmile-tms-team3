using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Commands;

public static class UpdateDriver
{
    public record Command(UpdateDriverDto Dto) : IRequest<DriverDto>;

    public class Handler : IRequestHandler<Command, DriverDto>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<DriverDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var driver = await _context.Drivers
                .Include(d => d.Depot)
                .Include(d => d.Zone)
                .FirstOrDefaultAsync(d => d.Id == request.Dto.Id, cancellationToken);

            if (driver is null)
                throw new InvalidOperationException($"Driver with ID '{request.Dto.Id}' was not found.");

            driver.UpdateProfile(
                request.Dto.FirstName,
                request.Dto.LastName,
                request.Dto.Phone,
                request.Dto.Email,
                request.Dto.PhotoUrl);

            driver.UpdateLicense(request.Dto.LicenseNumber, request.Dto.LicenseExpiryDate);
            driver.AssignZone(request.Dto.ZoneId);
            driver.AssignDepot(request.Dto.DepotId);

            await _context.SaveChangesAsync(cancellationToken);

            return DriverMapper.ToDto(driver);
        }
    }
}
