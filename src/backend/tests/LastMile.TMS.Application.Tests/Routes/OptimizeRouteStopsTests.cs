using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace LastMile.TMS.Application.Tests.Routes;

public class OptimizeRouteStopsTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly CreateRoute.Handler _createHandler;
    private readonly IRouteOptimizationService _optimizationService;
    private readonly ILogger<OptimizeRouteStops.Handler> _logger;
    private readonly OptimizeRouteStops.Handler _optimizeHandler;

    private readonly Depot _depot;
    private readonly Zone _zone;

    public OptimizeRouteStopsTests()
    {
        _context = TestAppDbContext.Create<OptimizeRouteStopsTests>();
        _currentUser = new FakeCurrentUserService();

        _createHandler = new CreateRoute.Handler(_context, _currentUser);
        _optimizationService = Substitute.For<IRouteOptimizationService>();
        _logger = Substitute.For<ILogger<OptimizeRouteStops.Handler>>();
        _optimizeHandler = new OptimizeRouteStops.Handler(_context, _optimizationService, _logger);

        var depotAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot Rd",
            City = "City",
            State = "ST",
            PostalCode = "00000",
            CountryCode = "US",
            GeoLocation = new NetTopologySuite.Geometries.Point(30.3, 59.95) { SRID = 4326 }
        };

        _depot = new Depot
        {
            Id = Guid.NewGuid(),
            Name = "Test Depot",
            IsActive = true,
            AddressId = depotAddress.Id,
            Address = depotAddress
        };

        _zone = new Zone
        {
            Id = Guid.NewGuid(),
            Name = "North Zone",
            IsActive = true,
            DepotId = _depot.Id,
            Depot = _depot
        };

        _context.Addresses.Add(depotAddress);
        _context.Depots.Add(_depot);
        _context.Zones.Add(_zone);
        _context.SaveChanges();
    }

    [Fact]
    public async Task Handle_WithValidRoute_OptimizesStops()
    {
        // Arrange — create route with 3 parcels
        var route = await CreateTestRoute();
        var parcels = AddParcelsWithGeoLocation(route, 3);

        // Mock optimization service to reverse the order
        _optimizationService
            .OptimizeAsync(Arg.Any<StopLocation>(), Arg.Any<IReadOnlyList<StopLocation>>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                var stops = call.Arg<IReadOnlyList<StopLocation>>();
                var order = new Dictionary<Guid, int>();
                for (var i = 0; i < stops.Count; i++)
                    order[stops[i].ParcelId] = stops.Count - i;
                return new OptimizedRoute(order, 5000, 300);
            });

        // Act
        var result = await _optimizeHandler.Handle(
            new OptimizeRouteStops.Command(route.Id), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.EstimatedDistance.Should().Be(5000m);
        result.EstimatedDuration.Should().Be(300);
        // Verify the optimization service was called
        await _optimizationService.Received(1)
            .OptimizeAsync(Arg.Any<StopLocation>(), Arg.Any<IReadOnlyList<StopLocation>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithNonDraftRoute_Throws()
    {
        // Arrange
        var route = await CreateTestRoute();
        var entity = await _context.DeliveryRoutes.FindAsync(route.Id);
        entity!.Status = RouteStatus.Dispatched;
        await _context.SaveChangesAsync();

        // Act
        var act = () => _optimizeHandler.Handle(
            new OptimizeRouteStops.Command(route.Id), CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Draft*");
    }

    [Fact]
    public async Task Handle_WithNoParcels_ReturnsUnchanged()
    {
        // Arrange — route with no parcels
        var route = await CreateTestRoute();

        // Act
        var result = await _optimizeHandler.Handle(
            new OptimizeRouteStops.Command(route.Id), CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.ParcelCount.Should().Be(0);
        // Should not call optimization service for empty route
        await _optimizationService.DidNotReceive()
            .OptimizeAsync(Arg.Any<StopLocation>(), Arg.Any<IReadOnlyList<StopLocation>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenOptimizationServiceFails_FallsBackToNearestNeighbor()
    {
        // Arrange
        var route = await CreateTestRoute();
        var parcels = AddParcelsWithGeoLocation(route, 3);

        // Mock optimization service to throw
        _optimizationService
            .OptimizeAsync(Arg.Any<StopLocation>(), Arg.Any<IReadOnlyList<StopLocation>>(), Arg.Any<CancellationToken>())
            .Returns<Task<OptimizedRoute>>(_ => throw new HttpRequestException("API unavailable"));

        // Act
        var result = await _optimizeHandler.Handle(
            new OptimizeRouteStops.Command(route.Id), CancellationToken.None);

        // Assert — fallback should succeed
        result.Should().NotBeNull();
        result.EstimatedDistance.Should().BeGreaterThan(0);
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

    private List<Parcel> AddParcelsWithGeoLocation(RouteDto routeDto, int count)
    {
        var parcels = new List<Parcel>();
        for (var i = 0; i < count; i++)
        {
            var address = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = $"{100 + i} Test St",
                City = "City",
                State = "ST",
                PostalCode = "00000",
                CountryCode = "US",
                GeoLocation = new NetTopologySuite.Geometries.Point(30.3 + i * 0.01, 59.95 + i * 0.01) { SRID = 4326 }
            };

            var parcel = new Parcel
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

            _context.Addresses.Add(address);
            _context.Parcels.Add(parcel);

            // Add to route via the route entity directly
            var routeEntity = _context.DeliveryRoutes.First(r => r.Id == routeDto.Id);
            routeEntity.AddParcel(parcel);

            parcels.Add(parcel);
        }

        _context.SaveChanges();
        return parcels;
    }

    public void Dispose() => _context.Dispose();
}
