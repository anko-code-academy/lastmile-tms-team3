using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Mappers;
using LastMile.TMS.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Drivers.Commands;

public static class UpdateDriverAvailability
{
    public record Command(UpdateDriverAvailabilityDto Dto) : IRequest<DriverDto>;

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

            var availability = new OperatingHours
            {
                Schedule = request.Dto.Schedule
                    .Select(s => new DailyAvailability
                    {
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime
                    })
                    .ToList(),
                DaysOff = request.Dto.DaysOff
                    .Select(d => new DayOff
                    {
                        Date = d.Date,
                        IsPaid = d.IsPaid,
                        Reason = d.Reason
                    })
                    .ToList()
            };

            driver.UpdateAvailability(availability);

            await _context.SaveChangesAsync(cancellationToken);

            return DriverMapper.ToDto(driver);
        }
    }
}
