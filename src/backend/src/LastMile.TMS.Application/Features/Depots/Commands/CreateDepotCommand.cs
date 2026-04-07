using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Depots.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Depots.Commands;

public static class CreateDepot
{
    public record Command(CreateDepotDto Dto) : IRequest<DepotDto>;

    public class Handler : IRequestHandler<Command, DepotDto>
    {
        private readonly IAppDbContextFactory _contextFactory;
        private readonly ICurrentUserService _currentUser;

        public Handler(IAppDbContextFactory contextFactory, ICurrentUserService currentUser)
        {
            _contextFactory = contextFactory;
            _currentUser = currentUser;
        }

        public async Task<DepotDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var address = new Domain.Entities.Address
            {
                Id = Guid.NewGuid(),
                Street1 = request.Dto.Address.Street1,
                Street2 = request.Dto.Address.Street2,
                City = request.Dto.Address.City,
                State = request.Dto.Address.State,
                PostalCode = request.Dto.Address.PostalCode,
                CountryCode = request.Dto.Address.CountryCode,
                IsResidential = request.Dto.Address.IsResidential,
                ContactName = request.Dto.Address.ContactName,
                CompanyName = request.Dto.Address.CompanyName,
                Phone = request.Dto.Address.Phone,
                Email = request.Dto.Address.Email,
                GeoLocation = request.Dto.Address.Latitude.HasValue && request.Dto.Address.Longitude.HasValue
                    ? new NetTopologySuite.Geometries.Point(request.Dto.Address.Longitude.Value, request.Dto.Address.Latitude.Value)
                    : null,
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = _currentUser.UserId
            };

            var depot = new Domain.Entities.Depot
            {
                Id = Guid.NewGuid(),
                Name = request.Dto.Name,
                AddressId = address.Id,
                Address = address,
                IsActive = request.Dto.IsActive,
                OperatingHours = request.Dto.OperatingHours is not null
                    ? new Domain.Entities.OperatingHours
                    {
                        Schedule = request.Dto.OperatingHours.Schedule.Select(s => new Domain.Entities.DailyAvailability
                        {
                            DayOfWeek = s.DayOfWeek,
                            StartTime = s.StartTime is not null ? TimeOnly.Parse(s.StartTime) : null,
                            EndTime = s.EndTime is not null ? TimeOnly.Parse(s.EndTime) : null
                        }).ToList(),
                        DaysOff = request.Dto.OperatingHours.DaysOff.Select(d => new Domain.Entities.DayOff
                        {
                            Date = d.Date,
                            IsPaid = d.IsPaid,
                            Reason = d.Reason
                        }).ToList()
                    }
                    : new Domain.Entities.OperatingHours(),
                CreatedAt = DateTimeOffset.UtcNow,
                CreatedBy = _currentUser.UserId
            };

            context.Depots.Add(depot);
            await context.SaveChangesAsync(cancellationToken);

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
                depot.Address.GeoLocation?.X,
                null
            ),
            depot.IsActive,
            new OperatingHoursDto(
                depot.OperatingHours.Schedule.Select(s => new DailyAvailabilityDto(s.DayOfWeek, s.StartTime?.ToString("HH:mm:ss"), s.EndTime?.ToString("HH:mm:ss"))).ToList(),
                depot.OperatingHours.DaysOff.Select(d => new DayOffDto(d.Date, d.IsPaid, d.Reason)).ToList()
            ),
            depot.CreatedAt,
            depot.LastModifiedAt
        );
    }
}
