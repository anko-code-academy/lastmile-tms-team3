using FluentAssertions;
using LastMile.TMS.Application.Features.Zones.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Zones;

public class ZoneQueryTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly GetAllZones.Handler _getAllHandler;
    private readonly GetZoneById.Handler _getByIdHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();

    public ZoneQueryTests()
    {
        _context = TestAppDbContext.Create();
        _getAllHandler = new GetAllZones.Handler(_context);
        _getByIdHandler = new GetZoneById.Handler(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            Address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = "123 Test St",
                City = "TestCity",
                State = "TS",
                PostalCode = "12345",
                CountryCode = "US"
            }
        };

        var activeZone = new Zone
        {
            Id = _zoneId,
            Name = "Active Zone",
            IsActive = true,
            DepotId = _depotId,
            Depot = depot
        };

        var inactiveZone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "Inactive Zone",
            IsActive = false,
            DepotId = _depotId,
            Depot = depot
        };

        var zoneForOtherDepot = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "Other Depot Zone",
            IsActive = true,
            DepotId = Guid.NewGuid(),
            Depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Other Depot",
                IsActive = true,
                AddressId = Guid.NewGuid(),
                Address = new Address
                {
                    Id = Guid.NewGuid(),
                    Street1 = "456 Other St",
                    City = "OtherCity",
                    State = "OS",
                    PostalCode = "54321",
                    CountryCode = "US"
                }
            }
        };

        _context.Depots.Add(depot);
        _context.Zones.Add(activeZone);
        _context.Zones.Add(inactiveZone);
        _context.Zones.Add(zoneForOtherDepot);
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetAllZones_ReturnsOnlyActiveZones()
    {
        var query = new GetAllZones.Query();
        var result = await _getAllHandler.Handle(query, CancellationToken.None);

        result.Should().HaveCount(2);
        result.Should().OnlyContain(z => z.IsActive);
        result.Should().Contain(z => z.Name == "Active Zone");
        result.Should().NotContain(z => z.Name == "Inactive Zone");
    }

    [Fact]
    public async Task GetAllZones_ReturnsAll_WhenIncludeInactiveIsTrue()
    {
        var query = new GetAllZones.Query(IncludeInactive: true);
        var result = await _getAllHandler.Handle(query, CancellationToken.None);

        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllZones_FiltersByDepotId()
    {
        var query = new GetAllZones.Query(DepotId: _depotId);
        var result = await _getAllHandler.Handle(query, CancellationToken.None);

        result.Should().HaveCount(1);
        result.Should().Contain(z => z.Name == "Active Zone");
    }

    [Fact]
    public async Task GetZoneById_ReturnsZone_WhenFound()
    {
        var query = new GetZoneById.Query(_zoneId);
        var result = await _getByIdHandler.Handle(query, CancellationToken.None);

        result.Should().NotBeNull();
        result.Id.Should().Be(_zoneId);
        result.Name.Should().Be("Active Zone");
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetZoneById_ThrowsKeyNotFoundException_WhenNotFound()
    {
        var query = new GetZoneById.Query(Guid.NewGuid());

        var act = async () => await _getByIdHandler.Handle(query, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
