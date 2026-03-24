using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Zones.Commands;
using LastMile.TMS.Application.Features.Zones.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Tests.Zones;

public class ZoneCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly CreateZone.Handler _createHandler;
    private readonly UpdateZone.Handler _updateHandler;
    private readonly DeleteZone.Handler _deleteHandler;
    private readonly ICurrentUserService _currentUser;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();

    public ZoneCommandTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
        _createHandler = new CreateZone.Handler(_context, _currentUser);
        _updateHandler = new UpdateZone.Handler(_context, _currentUser);
        _deleteHandler = new DeleteZone.Handler(_context);

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

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Test Zone",
            IsActive = true,
            DepotId = _depotId,
            Depot = depot
        };

        _context.Depots.Add(depot);
        _context.Zones.Add(zone);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateZone_WithValidInput_CreatesZone()
    {
        var command = new CreateZone.Command(
            new CreateZoneDto("New Zone", _depotId, null, true)
        );

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.Name.Should().Be("New Zone");
        result.DepotId.Should().Be(_depotId);
        result.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateZone_ThrowsKeyNotFoundException_WhenDepotNotFound()
    {
        var command = new CreateZone.Command(
            new CreateZoneDto("New Zone", Guid.NewGuid(), null, true)
        );

        var act = async () => await _createHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"*Depot with ID*{command.Dto.DepotId}*not found*");
    }

    [Fact]
    public async Task UpdateZone_WithValidInput_UpdatesZone()
    {
        var command = new UpdateZone.Command(
            new UpdateZoneDto(_zoneId, "Updated Zone", _depotId, null, false)
        );

        var result = await _updateHandler.Handle(command, CancellationToken.None);

        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Zone");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateZone_ThrowsKeyNotFoundException_WhenZoneNotFound()
    {
        var command = new UpdateZone.Command(
            new UpdateZoneDto(Guid.NewGuid(), "Updated Zone", _depotId, null, false)
        );

        var act = async () => await _updateHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"*Zone with ID*{command.Dto.Id}*not found*");
    }

    [Fact]
    public async Task UpdateZone_ThrowsKeyNotFoundException_WhenDepotNotFound()
    {
        var command = new UpdateZone.Command(
            new UpdateZoneDto(_zoneId, "Updated Zone", Guid.NewGuid(), null, false)
        );

        var act = async () => await _updateHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage($"*Depot with ID*{command.Dto.DepotId}*not found*");
    }

    [Fact]
    public async Task DeleteZone_WithValidId_ReturnsTrue()
    {
        var command = new DeleteZone.Command(_zoneId);

        var result = await _deleteHandler.Handle(command, CancellationToken.None);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteZone_ThrowsKeyNotFoundException_WhenZoneNotFound()
    {
        var command = new DeleteZone.Command(Guid.NewGuid());

        var act = async () => await _deleteHandler.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
