using FluentAssertions;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class ReorderRouteStopsTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly CreateRoute.Handler _createHandler;
    private readonly ReorderRouteStops.Handler _reorderHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;

    public ReorderRouteStopsTests()
    {
        _context = TestAppDbContext.Create<ReorderRouteStopsTests>();
        _currentUser = new FakeCurrentUserService();

        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _reorderHandler = new ReorderRouteStops.Handler(_context);

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
    public async Task Handle_WithValidReorder_AppliesNewOrder()
    {
        // Arrange — create route with 3 parcels
        var route = await CreateTestRoute();
        var p1 = CreateParcel();
        var p2 = CreateParcel();
        var p3 = CreateParcel();
        _context.Parcels.AddRange(p1, p2, p3);
        _context.SaveChanges();

        var routeEntity = _context.DeliveryRoutes.First(r => r.Id == route.Id);
        routeEntity.AddParcel(p1);
        routeEntity.AddParcel(p2);
        routeEntity.AddParcel(p3);
        _context.SaveChanges();

        // Reorder: p3 → 1, p1 → 2, p2 → 3
        var dto = new ReorderStopsDto(route.Id,
        [
            new StopOrderEntry(p3.Id, 1),
            new StopOrderEntry(p1.Id, 2),
            new StopOrderEntry(p2.Id, 3),
        ]);

        // Act
        var result = await _reorderHandler.Handle(
            new ReorderRouteStops.Command(dto), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        // Use a fresh context to read the persisted changes
        using var readContext = (TestAppDbContext)_context.CreateDbContext();
        var updatedRoute = readContext.DeliveryRoutes
            .Include(r => r.RouteParcels)
            .First(r => r.Id == route.Id);
        var rp1 = updatedRoute.RouteParcels.First(rp => rp.ParcelId == p1.Id);
        var rp2 = updatedRoute.RouteParcels.First(rp => rp.ParcelId == p2.Id);
        var rp3 = updatedRoute.RouteParcels.First(rp => rp.ParcelId == p3.Id);
        rp1.StopOrder.Should().Be(2);
        rp2.StopOrder.Should().Be(3);
        rp3.StopOrder.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithNonDraftRoute_Throws()
    {
        // Arrange
        var route = await CreateTestRoute();
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        var dto = new ReorderStopsDto(route.Id, [new StopOrderEntry(Guid.NewGuid(), 1)]);

        // Act
        var act = () => _reorderHandler.Handle(
            new ReorderRouteStops.Command(dto), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    private async Task<RouteDto> CreateTestRoute()
    {
        var dto = new CreateRouteDto(
            DateOnly.FromDateTime(DateTime.UtcNow),
            _zone.Id,
            null,
            null);

        return await _createHandler.Handle(new CreateRoute.Command(dto), CancellationToken.None);
    }

    private Parcel CreateParcel()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Test St",
            City = "City",
            State = "ST",
            PostalCode = "00000",
            CountryCode = "US"
        };

        _context.Addresses.Add(address);

        return new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = $"LMT-{Guid.NewGuid():N}"[..15],
            Status = ParcelStatus.Staged,
            RecipientAddressId = address.Id,
            RecipientAddress = address,
            ShipperAddressId = _depot.AddressId,
            ShipperAddress = _depot.Address,
            ZoneId = _zone.Id
        };
    }

    public void Dispose() => _context.Dispose();
}
