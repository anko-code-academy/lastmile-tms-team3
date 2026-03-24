using FluentAssertions;
using LastMile.TMS.Application.Features.Depots.Queries;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Depots;

public class DepotQueryTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly GetAllDepots.Handler _getAllHandler;
    private readonly GetDepotById.Handler _getByIdHandler;

    private readonly Guid _depotId = Guid.NewGuid();

    public DepotQueryTests()
    {
        _context = TestAppDbContext.Create();
        _getAllHandler = new GetAllDepots.Handler(_context);
        _getByIdHandler = new GetDepotById.Handler(_context);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var address1 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var address2 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Other St",
            City = "OtherCity",
            State = "OS",
            PostalCode = "54321",
            CountryCode = "US"
        };

        var activeDepot = new Depot
        {
            Id = _depotId,
            Name = "Active Depot",
            IsActive = true,
            AddressId = address1.Id,
            Address = address1
        };

        var inactiveDepot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Inactive Depot",
            IsActive = false,
            AddressId = address2.Id,
            Address = address2
        };

        _context.Addresses.Add(address1);
        _context.Addresses.Add(address2);
        _context.Depots.Add(activeDepot);
        _context.Depots.Add(inactiveDepot);
        _context.SaveChanges();
    }

    [Fact]
    public async Task GetAllDepots_ReturnsOnlyActiveDepots()
    {
        var query = new GetAllDepots.Query();
        var result = await _getAllHandler.Handle(query, CancellationToken.None);

        result.Should().HaveCount(1);
        result.Should().OnlyContain(d => d.IsActive);
        result.Should().Contain(d => d.Name == "Active Depot");
        result.Should().NotContain(d => d.Name == "Inactive Depot");
    }

    [Fact]
    public async Task GetAllDepots_ReturnsAll_WhenIncludeInactiveIsTrue()
    {
        var query = new GetAllDepots.Query(IncludeInactive: true);
        var result = await _getAllHandler.Handle(query, CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetDepotById_ReturnsDepot_WhenFound()
    {
        var query = new GetDepotById.Query(_depotId);
        var result = await _getByIdHandler.Handle(query, CancellationToken.None);

        result.Should().NotBeNull();
        result.Id.Should().Be(_depotId);
        result.Name.Should().Be("Active Depot");
        result.IsActive.Should().BeTrue();
        result.Address.City.Should().Be("TestCity");
    }

    [Fact]
    public async Task GetDepotById_ThrowsKeyNotFoundException_WhenNotFound()
    {
        var query = new GetDepotById.Query(Guid.NewGuid());

        var act = async () => await _getByIdHandler.Handle(query, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
