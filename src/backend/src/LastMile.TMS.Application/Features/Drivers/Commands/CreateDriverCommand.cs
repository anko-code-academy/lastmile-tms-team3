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
        private readonly IAppDbContextFactory _contextFactory;

        public Handler(IAppDbContextFactory contextFactory)
        {
            _contextFactory = contextFactory;
        }

        public async Task<DriverDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            if (request.Dto.DepotId.HasValue)
            {
                var depot = await context.Depots
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

            context.Drivers.Add(driver);
            await context.SaveChangesAsync(cancellationToken);

            var loaded = await context.Drivers
                .Include(d => d.Depot)
                .Include(d => d.Zone)
                .FirstAsync(d => d.Id == driver.Id, cancellationToken);

            return DriverMapper.ToDto(loaded);
        }
    }
}
