using FluentAssertions;
using LastMile.TMS.Application.Features.Drivers.Commands;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Drivers;

public class DriverCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly CreateDriver.Handler _createHandler;
    private readonly UpdateDriver.Handler _updateHandler;
    private readonly UpdateDriverStatus.Handler _updateStatusHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _driverId = Guid.NewGuid();

    public DriverCommandTests()
    {
        _context = TestAppDbContext.Create();
        _createHandler = new CreateDriver.Handler(_context);
        _updateHandler = new UpdateDriver.Handler(_context);
        _updateStatusHandler = new UpdateDriverStatus.Handler(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot St",
            City = "City",
            State = "ST",
            PostalCode = "00000",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address,
            OperatingHours = new OperatingHours()
        };

        var driver = Driver.Create(
            "John", "Doe", "+1111111111", "john@example.com",
            "DL000001", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2)),
            null, null, _depotId);
        driver.GetType().GetProperty("Id")!.SetValue(driver, _driverId);

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.Drivers.Add(driver);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateDriver_WithValidInput_CreatesDriver()
    {
        var dto = new CreateDriverDto(
            "Alice", "Cooper", "+2222222222", "alice@example.com",
            "DL000002", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, _depotId);

        var result = await _createHandler.Handle(new CreateDriver.Command(dto), CancellationToken.None);

        result.Should().NotBeNull();
        result.FirstName.Should().Be("Alice");
        result.LastName.Should().Be("Cooper");
        result.FullName.Should().Be("Alice Cooper");
        result.Email.Should().Be("alice@example.com");
        result.IsActive.Should().BeTrue();
        result.DepotId.Should().Be(_depotId);
    }

    [Fact]
    public async Task CreateDriver_WithNonExistentDepot_ThrowsInvalidOperationException()
    {
        var dto = new CreateDriverDto(
            "Bob", "Smith", "+3333333333", "bob@example.com",
            "DL000003", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, Guid.NewGuid());

        var act = async () => await _createHandler.Handle(new CreateDriver.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Depot*not found*");
    }

    [Fact]
    public async Task CreateDriver_WithoutDepot_CreatesDriver()
    {
        var dto = new CreateDriverDto(
            "Charlie", "Brown", "+4444444444", "charlie@example.com",
            "DL000004", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, null);

        var result = await _createHandler.Handle(new CreateDriver.Command(dto), CancellationToken.None);

        result.Should().NotBeNull();
        result.DepotId.Should().BeNull();
    }

    [Fact]
    public async Task UpdateDriver_WithValidInput_UpdatesDriver()
    {
        var dto = new UpdateDriverDto(
            _driverId, "Updated", "Name", "+9999999999", "updated@example.com",
            "DL999999", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(3)),
            null, null, null);

        var result = await _updateHandler.Handle(new UpdateDriver.Command(dto), CancellationToken.None);

        result.Should().NotBeNull();
        result.FirstName.Should().Be("Updated");
        result.LastName.Should().Be("Name");
        result.Email.Should().Be("updated@example.com");
        result.LicenseNumber.Should().Be("DL999999");
    }

    [Fact]
    public async Task UpdateDriver_WhenNotFound_ThrowsInvalidOperationException()
    {
        var dto = new UpdateDriverDto(
            Guid.NewGuid(), "A", "B", "+1", "a@b.com",
            "DL1", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, null);

        var act = async () => await _updateHandler.Handle(new UpdateDriver.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Driver*not found*");
    }

    [Fact]
    public async Task UpdateDriverStatus_Deactivates_ActiveDriver()
    {
        var dto = new UpdateDriverStatusDto(_driverId, false);

        var result = await _updateStatusHandler.Handle(new UpdateDriverStatus.Command(dto), CancellationToken.None);

        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateDriverStatus_Activates_InactiveDriver()
    {
        var deactivateDto = new UpdateDriverStatusDto(_driverId, false);
        await _updateStatusHandler.Handle(new UpdateDriverStatus.Command(deactivateDto), CancellationToken.None);

        var activateDto = new UpdateDriverStatusDto(_driverId, true);
        var result = await _updateStatusHandler.Handle(new UpdateDriverStatus.Command(activateDto), CancellationToken.None);

        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateDriverStatus_WhenNotFound_ThrowsInvalidOperationException()
    {
        var dto = new UpdateDriverStatusDto(Guid.NewGuid(), false);

        var act = async () => await _updateStatusHandler.Handle(new UpdateDriverStatus.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Driver*not found*");
    }

    public void Dispose() => _context.Dispose();
}
