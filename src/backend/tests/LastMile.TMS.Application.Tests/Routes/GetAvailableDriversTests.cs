using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class GetAvailableDriversTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly GetAvailableDrivers.Handler _handler;
    private readonly CreateRoute.Handler _createHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;
    private readonly DateOnly _today;

    public GetAvailableDriversTests()
    {
        _context = TestAppDbContext.Create<GetAvailableDriversTests>();
        _currentUser = new FakeCurrentUserService();
        _handler = new GetAvailableDrivers.Handler(_context);
        _createHandler = new CreateRoute.Handler(_context, _currentUser);

        _today = DateOnly.FromDateTime(DateTime.UtcNow);

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            Address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "1 Depot Rd",
                City = "City",
                State = "ST",
                PostalCode = "00000",
                CountryCode = "US"
            }
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.SaveChanges();
    }

    [Fact]
    public async Task Returns_ActiveDrivers_WithRouteCount()
    {
        // Arrange
        var driver1 = CreateDriver("John", "Doe", "DL-001");
        var driver2 = CreateDriver("Jane", "Smith", "DL-002");

        // Assign driver1 to a route today
        await CreateRouteWithDriver(_today, driver1);

        // Act
        var result = await _handler.Handle(
            new GetAvailableDrivers.Query(_today), CancellationToken.None);

        // Assert
        result.Should().HaveCount(2);
        var john = result.First(d => d.FullName == "John Doe");
        john.RouteCount.Should().Be(1);
        var jane = result.First(d => d.FullName == "Jane Smith");
        jane.RouteCount.Should().Be(0);
    }

    [Fact]
    public async Task Excludes_InactiveDrivers()
    {
        // Arrange
        var activeDriver = CreateDriver("Active", "Driver", "DL-ACT");
        var inactiveDriver = CreateDriver("Inactive", "Driver", "DL-INACT");
        inactiveDriver.Deactivate();
        _context.SaveChanges();

        // Act
        var result = await _handler.Handle(
            new GetAvailableDrivers.Query(_today), CancellationToken.None);

        // Assert
        result.Should().ContainSingle(d => d.FullName == "Active Driver");
        result.Should().NotContain(d => d.FullName == "Inactive Driver");
    }

    [Fact]
    public async Task CountsOnlyRoutesOnSameDate()
    {
        // Arrange
        var driver = CreateDriver("Busy", "Driver", "DL-BUSY");

        // Assign to route today and route tomorrow
        await CreateRouteWithDriver(_today, driver);
        await CreateRouteWithDriver(_today.AddDays(1), driver);

        // Act — query for today only
        var result = await _handler.Handle(
            new GetAvailableDrivers.Query(_today), CancellationToken.None);

        // Assert
        var busyDriver = result.First(d => d.FullName == "Busy Driver");
        busyDriver.RouteCount.Should().Be(1);
    }

    [Fact]
    public async Task ReturnsEmpty_WhenNoDrivers()
    {
        // Act
        var result = await _handler.Handle(
            new GetAvailableDrivers.Query(_today), CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    private Driver CreateDriver(string firstName, string lastName, string license)
    {
        var driver = Driver.Create(
            firstName, lastName, "555-0000", $"{firstName.ToLower()}@test.com",
            license, new DateOnly(2028, 12, 31),
            zoneId: _zone.Id, depotId: _depot.Id);

        _context.Drivers.Add(driver);
        _context.SaveChanges();
        return driver;
    }

    private async Task CreateRouteWithDriver(DateOnly date, Driver driver)
    {
        var dto = new CreateRouteDto(date, _zone.Id, driver.Id, null);
        await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);
    }

    public void Dispose() => _context.Dispose();
}
