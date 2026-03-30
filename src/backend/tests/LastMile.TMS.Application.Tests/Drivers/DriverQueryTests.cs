using FluentAssertions;
using LastMile.TMS.Application.Features.Drivers.DTOs;
using LastMile.TMS.Application.Features.Drivers.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Drivers;

public class DriverQueryTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly GetAllDrivers.Handler _getAllHandler;
    private readonly GetDriverById.Handler _getByIdHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _driver1Id = Guid.NewGuid();
    private readonly Guid _driver2Id = Guid.NewGuid();

    public DriverQueryTests()
    {
        _context = TestAppDbContext.Create();
        _getAllHandler = new GetAllDrivers.Handler(_context);
        _getByIdHandler = new GetDriverById.Handler(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Test St",
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

        var driver1 = Driver.Create(
            "Alice", "Smith", "+1111111111", "alice@example.com",
            "DL000001", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, _depotId);
        driver1.GetType().GetProperty("Id")!.SetValue(driver1, _driver1Id);

        var driver2 = Driver.Create(
            "Bob", "Jones", "+2222222222", "bob@example.com",
            "DL000002", DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            null, null, null);
        driver2.GetType().GetProperty("Id")!.SetValue(driver2, _driver2Id);
        driver2.Deactivate();

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.Drivers.AddRange(driver1, driver2);
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetAllDrivers_ReturnsAllDrivers()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(), CancellationToken.None);

        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetAllDrivers_WithPagination_ReturnsFirstPage()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(Page: 1, PageSize: 1), CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.TotalCount.Should().Be(2);
        result.TotalPages.Should().Be(2);
    }

    [Fact]
    public async Task GetAllDrivers_WithPagination_ReturnsSecondPage()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(Page: 2, PageSize: 1), CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAllDrivers_FilteredByDepot_ReturnsOnlyDepotDrivers()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(DepotId: _depotId), CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.Items[0].FullName.Should().Be("Alice Smith");
    }

    [Fact]
    public async Task GetAllDrivers_FilteredByIsActive_ReturnsOnlyActiveDrivers()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(IsActive: true), CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.Items[0].FullName.Should().Be("Alice Smith");
    }

    [Fact]
    public async Task GetAllDrivers_FilteredByIsInactive_ReturnsOnlyInactiveDrivers()
    {
        var result = await _getAllHandler.Handle(new GetAllDrivers.Query(IsActive: false), CancellationToken.None);

        result.Items.Should().HaveCount(1);
        result.Items[0].FullName.Should().Be("Bob Jones");
    }

    [Fact]
    public async Task GetDriverById_ExistingId_ReturnsDriver()
    {
        var result = await _getByIdHandler.Handle(new GetDriverById.Query(_driver1Id), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(_driver1Id);
        result.FirstName.Should().Be("Alice");
        result.DepotId.Should().Be(_depotId);
    }

    [Fact]
    public async Task GetDriverById_NonExistentId_ReturnsNull()
    {
        var result = await _getByIdHandler.Handle(new GetDriverById.Query(Guid.NewGuid()), CancellationToken.None);

        result.Should().BeNull();
    }

    public void Dispose() => _context.Dispose();
}
