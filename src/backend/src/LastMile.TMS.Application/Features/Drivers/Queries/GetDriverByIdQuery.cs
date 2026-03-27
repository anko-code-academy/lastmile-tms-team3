using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Queries;

public static class GetDriverById
{
    public record Query(Guid Id) : IRequest<DriverDto?>;

    public class Handler : IRequestHandler<Query, DriverDto?>
    {
        private readonly IAppDbContext _context;

        public Handler(IAppDbContext context)
        {
            _context = context;
        }

        public async Task<DriverDto?> Handle(Query request, CancellationToken cancellationToken)
        {
            var driver = await _context.Drivers
                .Include(d => d.Depot)
                .Include(d => d.Zone)
                .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);

            return driver is null ? null : DriverMapper.ToDto(driver);
        }
    }
}
