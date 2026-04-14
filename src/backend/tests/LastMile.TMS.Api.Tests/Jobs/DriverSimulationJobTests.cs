using FluentAssertions;
using LastMile.TMS.Api.Jobs;
using LastMile.TMS.Domain.Entities;
using NetTopologySuite.Geometries;
using Xunit;

namespace LastMile.TMS.Api.Tests.Jobs;

public class DriverSimulationJobInterpolateTests
{
    [Fact]
    public void Interpolate_AtStart_ReturnsFirstWaypoint()
    {
        var waypoints = new List<(double Lat, double Lng)>
        {
            (36.16, -86.78),
            (36.15, -86.79),
            (36.14, -86.80),
        };

        var (lat, lng) = DriverSimulationJob.Interpolate(waypoints, 0.0);

        lat.Should().BeApproximately(36.16, 0.0001);
        lng.Should().BeApproximately(-86.78, 0.0001);
    }

    [Fact]
    public void Interpolate_AtMidpoint_ReturnsMiddleOfSegment()
    {
        var waypoints = new List<(double Lat, double Lng)>
        {
            (36.0, -86.0),
            (36.2, -86.2),
        };

        var (lat, lng) = DriverSimulationJob.Interpolate(waypoints, 0.5);

        lat.Should().BeApproximately(36.1, 0.0001);
        lng.Should().BeApproximately(-86.1, 0.0001);
    }

    [Fact]
    public void Interpolate_AtEndOfSegment_ReturnsNextWaypoint()
    {
        var waypoints = new List<(double Lat, double Lng)>
        {
            (36.0, -86.0),
            (36.2, -86.2),
        };

        var (lat, lng) = DriverSimulationJob.Interpolate(waypoints, 1.0);

        lat.Should().BeApproximately(36.2, 0.0001);
        lng.Should().BeApproximately(-86.2, 0.0001);
    }

    [Fact]
    public void Interpolate_PartialProgress_ReturnsCorrectPosition()
    {
        var waypoints = new List<(double Lat, double Lng)>
        {
            (36.0, -86.0),
            (36.0, -86.0), // same point — segment has zero length
            (37.0, -87.0),
        };

        // progress=1.3 means segment 1, 30% through
        var (lat, lng) = DriverSimulationJob.Interpolate(waypoints, 1.3);

        lat.Should().BeApproximately(36.3, 0.0001);
        lng.Should().BeApproximately(-86.3, 0.0001);
    }

    [Fact]
    public void Interpolate_ProgressAtBoundary_ClampsToLastSegment()
    {
        var waypoints = new List<(double Lat, double Lng)>
        {
            (36.0, -86.0),
            (37.0, -87.0),
        };

        // progress=99.0 with only 1 segment — should clamp to end
        var (lat, lng) = DriverSimulationJob.Interpolate(waypoints, 99.0);

        lat.Should().BeApproximately(37.0, 0.0001);
        lng.Should().BeApproximately(-87.0, 0.0001);
    }
}

public class DriverSimulationJobBuildWaypointsTests
{
    [Fact]
    public void BuildWaypoints_IncludesDepotStopsAndReturnToDepot()
    {
        var depotAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot Rd",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            GeoLocation = new Point(-86.78, 36.16) { SRID = 4326 },
        };

        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Main St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37202",
            CountryCode = "US",
            GeoLocation = new Point(-86.79, 36.15) { SRID = 4326 },
        };

        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Main Depot",
                Address = depotAddress,
                AddressId = depotAddress.Id,
            },
            RouteParcels = new List<RouteParcel>
            {
                new()
                {
                    StopOrder = 1,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK001",
                        RecipientAddress = recipientAddress,
                        RecipientAddressId = recipientAddress.Id,
                    },
                },
            },
        };

        var waypoints = DriverSimulationJob.BuildWaypoints(route);

        // depot → stop → depot = 3 waypoints
        waypoints.Should().HaveCount(3);
        waypoints[0].Should().Be((36.16, -86.78)); // depot
        waypoints[1].Should().Be((36.15, -86.79)); // stop
        waypoints[2].Should().Be((36.16, -86.78)); // return to depot
    }

    [Fact]
    public void BuildWaypoints_OrdersStopsByStopOrder()
    {
        var depotAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot Rd",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            GeoLocation = new Point(-86.78, 36.16) { SRID = 4326 },
        };

        var addr1 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "A",
            City = "A",
            State = "TN",
            PostalCode = "1",
            CountryCode = "US",
            GeoLocation = new Point(-86.70, 36.10) { SRID = 4326 },
        };

        var addr2 = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "B",
            City = "B",
            State = "TN",
            PostalCode = "2",
            CountryCode = "US",
            GeoLocation = new Point(-86.80, 36.20) { SRID = 4326 },
        };

        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Depot",
                Address = depotAddress,
                AddressId = depotAddress.Id,
            },
            RouteParcels = new List<RouteParcel>
            {
                new()
                {
                    StopOrder = 2,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK002",
                        RecipientAddress = addr2,
                        RecipientAddressId = addr2.Id,
                    },
                },
                new()
                {
                    StopOrder = 1,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK001",
                        RecipientAddress = addr1,
                        RecipientAddressId = addr1.Id,
                    },
                },
            },
        };

        var waypoints = DriverSimulationJob.BuildWaypoints(route);

        // depot → stop1 (order 1) → stop2 (order 2) → depot
        waypoints[1].Should().Be((36.10, -86.70)); // stop order 1
        waypoints[2].Should().Be((36.20, -86.80)); // stop order 2
    }

    [Fact]
    public void BuildWaypoints_WithNoDepot_ReturnsOnlyStops()
    {
        var addr = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "A",
            City = "A",
            State = "TN",
            PostalCode = "1",
            CountryCode = "US",
            GeoLocation = new Point(-86.70, 36.10) { SRID = 4326 },
        };

        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Depot = null,
            RouteParcels = new List<RouteParcel>
            {
                new()
                {
                    StopOrder = 1,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK001",
                        RecipientAddress = addr,
                        RecipientAddressId = addr.Id,
                    },
                },
            },
        };

        var waypoints = DriverSimulationJob.BuildWaypoints(route);

        waypoints.Should().HaveCount(1); // just the stop, no depot wrap
    }

    [Fact]
    public void BuildWaypoints_SkipsStopsWithoutGeoLocation()
    {
        var depotAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "1 Depot Rd",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            GeoLocation = new Point(-86.78, 36.16) { SRID = 4326 },
        };

        var addrWithGeo = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "A",
            City = "A",
            State = "TN",
            PostalCode = "1",
            CountryCode = "US",
            GeoLocation = new Point(-86.70, 36.10) { SRID = 4326 },
        };

        var addrNoGeo = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "B",
            City = "B",
            State = "TN",
            PostalCode = "2",
            CountryCode = "US",
            // No GeoLocation
        };

        var route = new DeliveryRoute
        {
            Id = Guid.NewGuid(),
            Depot = new Depot
            {
                Id = Guid.NewGuid(),
                Name = "Depot",
                Address = depotAddress,
                AddressId = depotAddress.Id,
            },
            RouteParcels = new List<RouteParcel>
            {
                new()
                {
                    StopOrder = 1,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK001",
                        RecipientAddress = addrWithGeo,
                        RecipientAddressId = addrWithGeo.Id,
                    },
                },
                new()
                {
                    StopOrder = 2,
                    Parcel = new Parcel
                    {
                        Id = Guid.NewGuid(),
                        TrackingNumber = "TRK002",
                        RecipientAddress = addrNoGeo,
                        RecipientAddressId = addrNoGeo.Id,
                    },
                },
            },
        };

        var waypoints = DriverSimulationJob.BuildWaypoints(route);

        // depot → stop1 → depot (stop2 skipped, no geolocation)
        waypoints.Should().HaveCount(3);
    }
}
