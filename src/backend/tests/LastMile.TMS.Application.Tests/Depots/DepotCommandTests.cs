using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Depots.Commands;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Depots;

public class DepotCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly CreateDepot.Handler _createHandler;
    private readonly UpdateDepot.Handler _updateHandler;
    private readonly DeleteDepot.Handler _deleteHandler;
    private readonly ICurrentUserService _currentUser;

    private readonly Guid _depotId = Guid.NewGuid();

    public DepotCommandTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
        _createHandler = new CreateDepot.Handler(_context, _currentUser);
        _updateHandler = new UpdateDepot.Handler(_context, _currentUser);
        _deleteHandler = new DeleteDepot.Handler(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address,
            OperatingHours = new OperatingHours
            {
                Schedule = new List<DailyAvailability>
                {
                    new() { DayOfWeek = "Monday", StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(17, 0) }
                }
            }
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateDepot_WithValidInput_CreatesDepot()
    {
        var command = new CreateDepot.Command(
            new CreateDepotDto(
                "New Depot",
                new CreateAddressDto(
                    "789 New St",
                    null,
                    "NewCity",
                    "NS",
                    "67890",
                    "US"
                ),
                true
            )
        );

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.Name.Should().Be("New Depot");
        result.Address.Street1.Should().Be("789 New St");
        result.Address.City.Should().Be("NewCity");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateDepot_WithOperatingHours_CreatesDepotWithSchedule()
    {
        var operatingHours = new OperatingHoursDto(
            new List<DailyAvailabilityDto>
            {
                new("Monday", new TimeOnly(9, 0), new TimeOnly(17, 0)),
                new("Tuesday", new TimeOnly(9, 0), new TimeOnly(17, 0))
            },
            new List<DayOffDto>()
        );

        var command = new CreateDepot.Command(
            new CreateDepotDto(
                "Depot With Hours",
                new CreateAddressDto(
                    "789 New St",
                    null,
                    "NewCity",
                    "NS",
                    "67890",
                    "US"
                ),
                true,
                operatingHours
            )
        );

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.OperatingHours.Schedule.Should().HaveCount(2);
    }

    [Fact]
    public async Task UpdateDepot_WithValidInput_UpdatesDepot()
    {
        var command = new UpdateDepot.Command(
            new UpdateDepotDto(
                _depotId,
                "Updated Depot",
                new CreateAddressDto(
                    "123 Updated St",
                    null,
                    "UpdatedCity",
                    "US",
                    "12345",
                    "US"
                ),
                false,
                null
            )
        );

        var result = await _updateHandler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Depot");
        result.Address.Street1.Should().Be("123 Updated St");
        result.Address.City.Should().Be("UpdatedCity");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateDepot_ThrowsKeyNotFoundException_WhenDepotNotFound()
    {
        var command = new UpdateDepot.Command(
            new UpdateDepotDto(
                Guid.NewGuid(),
                "Updated Depot",
                new CreateAddressDto(
                    "123 Updated St",
                    null,
                    "UpdatedCity",
                    "US",
                    "12345",
                    "US"
                ),
                false,
                null
            )
        );

        var act = async () => await _updateHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task DeleteDepot_WithValidId_ReturnsTrue()
    {
        var command = new DeleteDepot.Command(_depotId);

        var result = await _deleteHandler.Handle(command, CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteDepot_ThrowsKeyNotFoundException_WhenDepotNotFound()
    {
        var command = new DeleteDepot.Command(Guid.NewGuid());

        var act = async () => await _deleteHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
