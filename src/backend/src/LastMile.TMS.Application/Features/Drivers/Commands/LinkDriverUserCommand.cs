using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Commands;

public static class LinkDriverUser
{
    public record Command(LinkDriverUserDto Dto) : IRequest<DriverDto>;

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
                .FirstOrDefaultAsync(d => d.Id == request.Dto.DriverId, cancellationToken);

            if (driver is null)
                throw new InvalidOperationException($"Driver with ID '{request.Dto.DriverId}' was not found.");

            driver.LinkUser(request.Dto.UserId);

            await _context.SaveChangesAsync(cancellationToken);

            return DriverMapper.ToDto(driver);
        }
    }
}
