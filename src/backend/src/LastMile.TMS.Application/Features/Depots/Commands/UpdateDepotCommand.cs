using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Depots.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Depots.Commands;

public static class UpdateDepot
{
    public record Command(UpdateDepotDto Dto) : IRequest<DepotDto>;

    public class Handler : IRequestHandler<Command, DepotDto>
    {
        private readonly IAppDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public Handler(IAppDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public async Task<DepotDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var depot = await _context.Depots
                .Include(d => d.Address)
                .FirstOrDefaultAsync(d => d.Id == request.Dto.Id, cancellationToken)
                ?? throw new KeyNotFoundException($"Depot with ID {request.Dto.Id} not found");

            depot.Name = request.Dto.Name;
            depot.IsActive = request.Dto.IsActive;
            depot.LastModifiedAt = DateTimeOffset.UtcNow;
            depot.LastModifiedBy = _currentUser.UserId;

            depot.Address.Street1 = request.Dto.Address.Street1;
            depot.Address.Street2 = request.Dto.Address.Street2;
            depot.Address.City = request.Dto.Address.City;
            depot.Address.State = request.Dto.Address.State;
            depot.Address.PostalCode = request.Dto.Address.PostalCode;
            depot.Address.CountryCode = request.Dto.Address.CountryCode;
            depot.Address.IsResidential = request.Dto.Address.IsResidential;
            depot.Address.ContactName = request.Dto.Address.ContactName;
            depot.Address.CompanyName = request.Dto.Address.CompanyName;
            depot.Address.Phone = request.Dto.Address.Phone;
            depot.Address.Email = request.Dto.Address.Email;

            if (request.Dto.Address.Latitude.HasValue && request.Dto.Address.Longitude.HasValue)
            {
                depot.Address.GeoLocation = new NetTopologySuite.Geometries.Point(
                    request.Dto.Address.Longitude.Value,
                    request.Dto.Address.Latitude.Value);
            }

            if (request.Dto.OperatingHours is not null)
            {
                depot.OperatingHours = new Domain.Entities.OperatingHours
                {
                    Schedule = request.Dto.OperatingHours.Schedule.Select(s => new Domain.Entities.DailyAvailability
                    {
                        DayOfWeek = s.DayOfWeek,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime
                    }).ToList(),
                    DaysOff = request.Dto.OperatingHours.DaysOff.Select(d => new Domain.Entities.DayOff
                    {
                        Date = d.Date,
                        IsPaid = d.IsPaid,
                        Reason = d.Reason
                    }).ToList()
                };
            }

            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(depot);
        }

        private static DepotDto MapToDto(Domain.Entities.Depot depot) => new(
            depot.Id,
            depot.Name,
            new AddressDto(
                depot.Address.Street1,
                depot.Address.Street2,
                depot.Address.City,
                depot.Address.State,
                depot.Address.PostalCode,
                depot.Address.CountryCode,
                depot.Address.IsResidential,
                depot.Address.ContactName,
                depot.Address.CompanyName,
                depot.Address.Phone,
                depot.Address.Email,
                depot.Address.GeoLocation?.Y,
                depot.Address.GeoLocation?.X
            ),
            depot.IsActive,
            new OperatingHoursDto(
                depot.OperatingHours.Schedule.Select(s => new DailyAvailabilityDto(s.DayOfWeek, s.StartTime, s.EndTime)).ToList(),
                depot.OperatingHours.DaysOff.Select(d => new DayOffDto(d.Date, d.IsPaid, d.Reason)).ToList()
            ),
            depot.CreatedAt,
            depot.LastModifiedAt
        );
    }
}