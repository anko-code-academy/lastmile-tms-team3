using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Persistence.Seeding;

/// <summary>
/// NYC-based seed data: 4 depots, 7 zones (Manhattan zone left for manual creation).
/// All addresses are within New York City.
/// </summary>
public class ApplicationDbSeeder(
    AppDbContext dbContext,
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IConfiguration configuration,
    ILogger<ApplicationDbSeeder> logger) : IDbSeeder
{
    // ── Depot & Zone layout (full NYC coverage, non-overlapping grid) ─────
    //
    //  Staten Island │ Brooklyn     │ Queens West │ Queens East
    //   [-74.26,-74.04]│[-74.04,-73.90]│[-73.90,-73.82]│[-73.82,-73.70]
    //   40.50–40.65   │ 40.57–40.74  │ 40.57–40.80  │ 40.57–40.80
    //                 │              │              │
    //  Depot 3: SI    │ Depot 0: BK  │ Depot 1: QU  │
    //  (SI North/South)│(BK South/North)│(QU West/East)│
    //                 │              │─────────────────────────────
    //                 │  Manhattan   │ Bronx [-73.93,-73.77]
    //                 │  (user)      │ 40.80–40.92
    //                 │              │ Depot 2: BX
    //
    //  Depot 0: "Brooklyn Hub"            – 2 zones (Brooklyn South, Brooklyn North)
    //  Depot 1: "Queens Distribution"     – 2 zones (Queens West, Queens East)
    //  Depot 2: "Bronx Terminal"          – 1 zone  (Bronx)  ← Manhattan zone skipped
    //  Depot 3: "Staten Island Yard"      – 2 zones (SI North, SI South)
    //
    //  Total: 7 zones, covering all of NYC except Manhattan (user creates)

    private static readonly string[] DepotNames =
    [
        "Brooklyn Hub",
        "Queens Distribution",
        "Bronx Terminal",
        "Staten Island Yard",
    ];

    private static readonly (string Street, string City, string State, string Zip, double Lon, double Lat)[] DepotAddresses =
    [
        ("100 Industry Lane",      "Brooklyn",       "NY", "11201", -73.974, 40.662),
        ("200 Commerce Boulevard", "Queens",         "NY", "11373", -73.872, 40.730),
        ("300 Terminal Avenue",    "Bronx",          "NY", "10451", -73.898, 40.828),
        ("400 Freight Road",       "Staten Island",  "NY", "10301", -74.152, 40.580),
    ];

    // Each zone: (label, minLon, minLat, maxLon, maxLat). Depot must fall inside one of its zones.
    private static readonly (string Label, double MinLon, double MinLat, double MaxLon, double MaxLat)[][] ZoneSpecsPerDepot =
    [
        // Depot 0 — Brooklyn Hub (depot at -73.974, 40.662)
        [
            ("Brooklyn South", -74.04, 40.57, -73.90, 40.65),
            ("Brooklyn North", -74.04, 40.65, -73.90, 40.74),
        ],
        // Depot 1 — Queens Distribution (depot at -73.872, 40.730)
        [
            ("Queens West",  -73.90, 40.57, -73.82, 40.80),
            ("Queens East",  -73.82, 40.57, -73.70, 40.80),
        ],
        // Depot 2 — Bronx Terminal (depot at -73.898, 40.828) — Manhattan zone skipped
        [
            ("Bronx",  -73.93, 40.80, -73.77, 40.92),
            // ("Manhattan",  -74.02, 40.70, -73.93, 40.88),  ← user creates this in the UI
        ],
        // Depot 3 — Staten Island Yard (depot at -74.152, 40.580)
        [
            ("Staten Island North", -74.26, 40.57, -74.04, 40.65),
            ("Staten Island South", -74.26, 40.50, -74.04, 40.57),
        ],
    ];

    private static readonly string[] RoleNames =
    [
        nameof(UserRole.Admin),
        nameof(UserRole.OperationsManager),
        nameof(UserRole.WarehouseManager),
        nameof(UserRole.Dispatcher),
        nameof(UserRole.WarehouseOperator),
        nameof(UserRole.DepotOperator),
        nameof(UserRole.Driver)
    ];

    // ── NYC address helpers ─────────────────────────────────────────────

    private static readonly string[] NycStreetNames =
    [
        "Broadway", "5th Ave", "Madison Ave", "Lexington Ave", "Park Ave",
        "Amsterdam Ave", "Columbus Ave", "Atlantic Ave", "Flatbush Ave",
        "Fulton St", "Court St", "Smith St", "Queens Blvd", "Northern Blvd",
        "Jamaica Ave", "Grand Concourse", "Fordham Rd", "Victory Blvd",
        "Richmond Rd", "Hylan Blvd", "Wall St", "Canal St", "Houston St",
    ];

    private static readonly string[] StreetSuffixes = ["St", "Ave", "Blvd", "Dr", "Ln", "Ct", "Way", "Pl"];

    private static readonly string[] FirstNames =
    [
        "James", "Mary", "Robert", "Patricia", "John", "Jennifer",
        "Michael", "Linda", "David", "Barbara", "William", "Elizabeth",
        "Carlos", "Maria", "Antonio", "Rosa", "Wei", "Mei",
        "Kofi", "Amara", "Viktor", "Olga", "Darnell", "Lakisha",
    ];

    private static readonly string[] LastNames =
    [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
        "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez",
        "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
        "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
        "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young",
    ];

    private static readonly string[] ParcelTypes = ["Standard", "Express", "Economy", "Overnight", "Fragile", "Heavy", "Document"];
    private static readonly string[] ContentDescriptions = ["Electronics", "Clothing", "Books", "Home goods", "Food items", "Toys", "Cosmetics"];

    private const string City = "New York";
    private const string State = "NY";
    private const string DefaultZip = "10001";

    // ── Seed orchestration ──────────────────────────────────────────────

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync();
        await SeedAdminUserAsync();
        await SeedDepotsAsync(cancellationToken);
        await SeedOperationsManagerUserAsync();
        await SeedDepotOperatorUsersAsync(cancellationToken);
        await SeedWarehouseManagerUsersAsync(cancellationToken);
        await SeedDispatcherUserAsync();
        await SeedVehiclesAsync(cancellationToken);
        await SeedZonesAsync(cancellationToken);
        await SeedAislesAndBinsAsync(cancellationToken);
        await SeedDriversAsync(cancellationToken);
        await SeedDeliveryRoutesAsync(cancellationToken);
        await SeedParcelsAsync(cancellationToken);
        await SeedSortDemoParcelsAsync(cancellationToken);
        await SeedRouteReadyParcelsAsync(cancellationToken);
        await SeedRouteParcelAssignmentsAsync(cancellationToken);
        await SeedInboundManifestsAsync(cancellationToken);
    }

    // ── Depots ──────────────────────────────────────────────────────────

    private async Task SeedDepotsAsync(CancellationToken cancellationToken)
    {
        var existingNames = await dbContext.Depots.Select(d => d.Name).ToHashSetAsync(cancellationToken);
        var gf = new GeometryFactory(new PrecisionModel(), 4326);

        var toSeed = new List<Depot>();
        for (var i = 0; i < DepotNames.Length; i++)
        {
            if (existingNames.Contains(DepotNames[i])) continue;
            var a = DepotAddresses[i];
            toSeed.Add(CreateDepot(DepotNames[i], a.Street, a.City, a.State, a.Zip, a.Lon, a.Lat, gf));
        }

        if (toSeed.Count == 0) return;

        await dbContext.Addresses.AddRangeAsync(toSeed.Select(d => d.Address), cancellationToken);
        await dbContext.Depots.AddRangeAsync(toSeed, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} depot records", toSeed.Count);
    }

    private static Depot CreateDepot(string name, string street1, string city, string state, string postalCode, double lon, double lat, GeometryFactory gf)
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = street1,
            City = city,
            State = state,
            PostalCode = postalCode,
            CountryCode = "US",
            IsResidential = false,
            CompanyName = name,
            GeoLocation = gf.CreatePoint(new Coordinate(lon, lat)),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        return new Depot
        {
            Id = Guid.NewGuid(),
            Name = name,
            AddressId = address.Id,
            Address = address,
            IsActive = true,
            OperatingHours = WeekdaySchedule(),
            CreatedAt = DateTimeOffset.UtcNow,
        };
    }

    // ── Vehicles ────────────────────────────────────────────────────────

    private async Task SeedVehiclesAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var existingPlates = await dbContext.Vehicles.Select(v => v.RegistrationPlate).ToHashSetAsync(cancellationToken);
        var depotByName = depots.GroupBy(d => d.Name).ToDictionary(g => g.Key, g => g.First());

        // 10 vehicles per depot: 4 vans, 3 cars, 3 bikes
        var specs = new List<(string Plate, VehicleType Type, VehicleStatus Status, int Parcels, int Weight, string Depot)>();

        foreach (var depotName in DepotNames)
        {
            var prefix = depotName.StartsWith("Brooklyn") ? "BK" :
                         depotName.StartsWith("Queens") ? "QU" :
                         depotName.StartsWith("Bronx") ? "BX" : "SI";

            specs.Add(($"{prefix}-VAN-001", VehicleType.Van,  VehicleStatus.Available,   60, 800, depotName));
            specs.Add(($"{prefix}-VAN-002", VehicleType.Van,  VehicleStatus.Available,   65, 850, depotName));
            specs.Add(($"{prefix}-VAN-003", VehicleType.Van,  VehicleStatus.InUse,       55, 750, depotName));
            specs.Add(($"{prefix}-VAN-004", VehicleType.Van,  VehicleStatus.Maintenance, 70, 900, depotName));
            specs.Add(($"{prefix}-CAR-001", VehicleType.Car,  VehicleStatus.Available,   25, 350, depotName));
            specs.Add(($"{prefix}-CAR-002", VehicleType.Car,  VehicleStatus.Available,   30, 400, depotName));
            specs.Add(($"{prefix}-CAR-003", VehicleType.Car,  VehicleStatus.InUse,       28, 380, depotName));
            specs.Add(($"{prefix}-BKE-001", VehicleType.Bike, VehicleStatus.Available,    5,  30, depotName));
            specs.Add(($"{prefix}-BKE-002", VehicleType.Bike, VehicleStatus.Available,    6,  35, depotName));
            specs.Add(($"{prefix}-BKE-003", VehicleType.Bike, VehicleStatus.Maintenance,  4,  25, depotName));
        }

        var toAdd = specs
            .Where(s => !existingPlates.Contains(s.Plate) && depotByName.ContainsKey(s.Depot))
            .Select(s => new Vehicle
            {
                Id = Guid.NewGuid(),
                RegistrationPlate = s.Plate,
                Type = s.Type,
                Status = s.Status,
                ParcelCapacity = s.Parcels,
                WeightCapacity = s.Weight,
                WeightUnit = WeightUnit.Kg,
                DepotId = depotByName[s.Depot].Id,
                Depot = depotByName[s.Depot],
                CreatedAt = DateTimeOffset.UtcNow,
            })
            .ToList();

        if (toAdd.Count == 0) return;

        await dbContext.Vehicles.AddRangeAsync(toAdd, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} vehicle records", toAdd.Count);
    }

    // ── Zones ───────────────────────────────────────────────────────────

    private async Task SeedZonesAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var existingNames = await dbContext.Zones.Select(z => z.Name).ToHashSetAsync(cancellationToken);
        var gf = new GeometryFactory(new PrecisionModel(), 4326);
        var zones = new List<Zone>();

        for (var di = 0; di < DepotNames.Length; di++)
        {
            var depot = depots.FirstOrDefault(d => d.Name == DepotNames[di]);
            if (depot is null) continue;

            foreach (var (label, minLon, minLat, maxLon, maxLat) in ZoneSpecsPerDepot[di])
            {
                var name = $"{depot.Name} — {label}";
                if (existingNames.Contains(name)) continue;

                zones.Add(new Zone
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    IsActive = true,
                    DepotId = depot.Id,
                    Boundary = gf.CreatePolygon(
                    [
                        new Coordinate(minLon, minLat),
                        new Coordinate(maxLon, minLat),
                        new Coordinate(maxLon, maxLat),
                        new Coordinate(minLon, maxLat),
                        new Coordinate(minLon, minLat),
                    ]),
                    CreatedAt = DateTimeOffset.UtcNow,
                });
            }
        }

        if (zones.Count == 0) return;

        await dbContext.Zones.AddRangeAsync(zones, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} zone records", zones.Count);
    }

    // ── Aisles & Bins ───────────────────────────────────────────────────

    private async Task SeedAislesAndBinsAsync(CancellationToken cancellationToken)
    {
        var existingAisleZoneIds = await dbContext.Aisles.Select(a => a.ZoneId).ToHashSetAsync(cancellationToken);
        var zones = await dbContext.Zones
            .Where(z => !existingAisleZoneIds.Contains(z.Id))
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);

        if (zones.Count == 0) return;

        var aisles = new List<Aisle>();
        var bins = new List<Bin>();

        foreach (var zone in zones)
        {
            var seg = zone.Id.ToString("N")[..6].ToUpperInvariant();

            foreach (var (code, sort) in new[] { ("A", 1), ("B", 2) })
            {
                var aisle = new Aisle
                {
                    Id = Guid.NewGuid(),
                    ZoneId = zone.Id,
                    Name = $"Aisle {code}",
                    Code = code,
                    SortOrder = sort,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                };
                aisles.Add(aisle);

                for (var i = 1; i <= 6; i++)
                {
                    bins.Add(new Bin
                    {
                        Id = Guid.NewGuid(),
                        AisleId = aisle.Id,
                        Name = $"Bin {code}-{i:00}",
                        Code = $"{code}-{i:00}",
                        LabelCode = $"BIN-{seg}-{code}{i:00}",
                        CapacityParcelCount = 60 + i * 10,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow,
                    });
                }
            }
        }

        await dbContext.Aisles.AddRangeAsync(aisles, cancellationToken);
        await dbContext.Bins.AddRangeAsync(bins, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {AisleCount} aisles and {BinCount} bins", aisles.Count, bins.Count);
    }

    // ── Drivers ─────────────────────────────────────────────────────────

    private async Task SeedDriversAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Drivers.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.OrderBy(d => d.Name).ToListAsync(cancellationToken);
        var depotById = depots.ToDictionary(d => d.Id);
        var random = new Random(42);

        // 10 drivers per depot
        var driverData = new List<(string First, string Last, string Phone, string Email, string License, int YearsExpiry, Guid DepotId, bool Active)>();

        var firstPool = new[] { "James", "Maria", "Ethan", "Olivia", "Liam", "Sophia", "Noah", "Emma", "Mason", "Ava",
                                "Darius", "Grace", "Henry", "Jack", "Lily", "Oliver", "Harper", "Aiden", "Scarlett", "Riley",
                                "Priya", "Sofia", "Zoe", "Julian", "Penelope", "Lincoln", "Hannah", "Mateo", "Aubrey", "Hunter",
                                "Carlos", "Wei", "Amara", "Viktor", "Kofi", "Darnell", "Antonio", "Lakisha", "Rosa", "Olga" };
        var lastPool = new[] { "Carter", "Gonzalez", "Harris", "Martin", "Thompson", "Anderson", "Jackson", "White",
                               "Taylor", "Moore", "Lee", "Clark", "Lewis", "Robinson", "Walker", "Webb", "Hall",
                               "Young", "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams",
                               "Baker", "Sharma", "Nelson", "Mitchell", "Perez", "Roberts", "Campbell", "Parker",
                               "Evans", "Edwards", "Collins", "Stewart", "Sanchez" };

        var licensePrefixes = new[] { "BK", "QU", "BX", "SI" };

        for (var di = 0; di < DepotNames.Length; di++)
        {
            var depot = depots.FirstOrDefault(d => d.Name == DepotNames[di]);
            if (depot is null) continue;

            var prefix = licensePrefixes[di];
            for (var j = 0; j < 10; j++)
            {
                var idx = di * 10 + j;
                var first = firstPool[idx % firstPool.Length];
                var last = lastPool[idx % lastPool.Length];
                var phone = $"1212{random.Next(200, 999):D3}{random.Next(1000, 9999):D4}";
                var email = $"{first.ToLower()}.{last.ToLower()}@lastmile.local";
                var license = $"{prefix}-DL-{random.Next(100000, 999999)}";

                driverData.Add((first, last, phone, email, license, random.Next(1, 5), depot.Id, idx != 7 && idx != 18));
            }
        }

        var drivers = driverData.Select(d =>
        {
            var driver = Driver.Create(
                d.First, d.Last, d.Phone, d.Email, d.License,
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(d.YearsExpiry)),
                photoUrl: null, zoneId: null, depotId: d.DepotId);
            driver.UpdateAvailability(d.DepotId == depotById[d.DepotId].Id ? WeekdaySchedule() : WeekdaySchedule());
            if (!d.Active) driver.Deactivate();
            return driver;
        }).ToList();

        await dbContext.Drivers.AddRangeAsync(drivers, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} driver records", drivers.Count);
    }

    // ── Delivery Routes ─────────────────────────────────────────────────

    private async Task SeedDeliveryRoutesAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.DeliveryRoutes.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var drivers = await dbContext.Drivers.ToListAsync(cancellationToken);
        var zones = await dbContext.Zones.ToListAsync(cancellationToken);
        var vehicles = await dbContext.Vehicles.Where(v => v.Status == VehicleStatus.Available).ToListAsync(cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var random = new Random(42);
        var routes = new List<DeliveryRoute>();

        var routeNames = new[] { "Morning Run", "Midday Run", "Afternoon Run", "Evening Run", "Express Drop", "Priority Run" };
        var statuses = new[] { RouteStatus.Draft, RouteStatus.Draft, RouteStatus.Draft, RouteStatus.Dispatched, RouteStatus.InProgress, RouteStatus.Completed };

        foreach (var depot in depots)
        {
            var depotDrivers = drivers.Where(d => d.DepotId == depot.Id).ToList();
            var depotZones = zones.Where(z => z.DepotId == depot.Id).ToList();
            var depotVehicles = vehicles.Where(v => v.DepotId == depot.Id).ToList();

            if (depotDrivers.Count == 0 || depotZones.Count == 0) continue;

            for (var dayOffset = -1; dayOffset <= 1; dayOffset++)
            {
                var date = today.AddDays(dayOffset);
                var routeCount = Math.Min(routeNames.Length, depotDrivers.Count);

                for (var r = 0; r < routeCount; r++)
                {
                    var zone = depotZones[r % depotZones.Count];
                    var driver = depotDrivers[r % depotDrivers.Count];
                    var vehicle = depotVehicles.Count > 0 ? depotVehicles[r % depotVehicles.Count] : null;
                    var status = statuses[(dayOffset + 1) * 2 + r % 2];

                    Guid? driverId = status != RouteStatus.Draft ? driver.Id : null;
                    Guid? vehicleId = status != RouteStatus.Draft ? vehicle?.Id : null;

                    routes.Add(new DeliveryRoute
                    {
                        Id = Guid.NewGuid(),
                        Name = $"{depot.Name} — {routeNames[r]}",
                        DepotId = depot.Id,
                        DriverId = driverId,
                        ZoneId = zone.Id,
                        VehicleId = vehicleId,
                        Date = date,
                        Status = status,
                        CreatedAt = DateTimeOffset.UtcNow.AddHours(-random.Next(1, 72)),
                    });
                }
            }
        }

        await dbContext.DeliveryRoutes.AddRangeAsync(routes, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {RouteCount} delivery routes", routes.Count);
    }

    // ── Parcels (main set, spread across all statuses) ───────────────────

    private async Task SeedParcelsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Parcels.AnyAsync(p => p.TrackingNumber.StartsWith("LM-2026-"), cancellationToken))
            return;

        var depots = await dbContext.Depots.OrderBy(d => d.Name).ToListAsync(cancellationToken);
        var zones = await dbContext.Zones.OrderBy(z => z.Name).ToListAsync(cancellationToken);
        var routes = await dbContext.DeliveryRoutes.AsNoTracking().OrderBy(r => r.Name).ToListAsync(cancellationToken);
        var binsByZone = await dbContext.Bins.AsNoTracking()
            .Include(b => b.Aisle)
            .Where(b => b.IsActive && b.Aisle.IsActive)
            .GroupBy(b => b.Aisle.ZoneId)
            .ToDictionaryAsync(g => g.Key, g => g.OrderBy(b => b.Code).ToList(), cancellationToken);

        var zonesByDepot = zones.GroupBy(z => z.DepotId).ToDictionary(g => g.Key, g => g.ToList());
        var routesByDepot = routes.GroupBy(r => r.DepotId).ToDictionary(g => g.Key, g => g.ToList());

        if (depots.Count == 0) return;

        var gf = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(42);
        var serviceTypes = Enum.GetValues<ServiceType>();

        // Shipper addresses in NYC
        var shipperCompanies = new[]
        {
            ("Empire State Logistics",  "500 5th Ave"),
            ("Harbor Freight NYC",      "120 Atlantic Wharf"),
            ("Tri-State Express",       "800 Queens Plaza"),
            ("Liberty Parcel Co",       "300 Grand Concourse"),
            ("Gateway Distribution",    "700 Bay St"),
        };

        var shipperAddresses = shipperCompanies.Select((s, idx) =>
        {
            var (lon, lat) = idx switch
            {
                0 => (-73.980, 40.753),
                1 => (-73.990, 40.688),
                2 => (-73.870, 40.745),
                3 => (-73.900, 40.825),
                _ => (-74.150, 40.640),
            };
            return new Address
            {
                Id = Guid.NewGuid(),
                Street1 = s.Item2,
                City = City,
                State = State,
                PostalCode = $"{10001 + idx * 200}",
                CountryCode = "US",
                IsResidential = false,
                CompanyName = s.Item1,
                GeoLocation = gf.CreatePoint(new Coordinate(lon, lat)),
                CreatedAt = DateTimeOffset.UtcNow,
            };
        }).ToList();

        await dbContext.Addresses.AddRangeAsync(shipperAddresses, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var eventDescriptions = new Dictionary<ParcelStatus, string[]>
        {
            [ParcelStatus.Registered]      = ["Label created and registered"],
            [ParcelStatus.ReceivedAtDepot] = ["Label created and registered", "Package received at depot"],
            [ParcelStatus.Sorted]          = ["Label created and registered", "Package received at depot", "Package sorted to zone"],
            [ParcelStatus.Staged]          = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading"],
            [ParcelStatus.Loaded]          = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle"],
            [ParcelStatus.OutForDelivery]  = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery"],
            [ParcelStatus.Delivered]       = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Package delivered successfully"],
            [ParcelStatus.FailedAttempt]   = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Delivery attempted — no one home"],
            [ParcelStatus.ReturnedToDepot] = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Package returned to depot"],
            [ParcelStatus.Cancelled]       = ["Label created and registered", "Package cancelled"],
            [ParcelStatus.Exception]       = ["Label created and registered", "Package received at depot", "Package sorted to zone", "Exception: address not found"],
        };

        var eventTypesForStatus = new Dictionary<ParcelStatus, EventType[]>
        {
            [ParcelStatus.Registered]      = [EventType.LabelCreated],
            [ParcelStatus.ReceivedAtDepot] = [EventType.LabelCreated, EventType.ArrivedAtFacility],
            [ParcelStatus.Sorted]          = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility],
            [ParcelStatus.Staged]          = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility, EventType.DepartedFacility],
            [ParcelStatus.Loaded]          = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.HeldAtFacility],
            [ParcelStatus.OutForDelivery]  = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.OutForDelivery],
            [ParcelStatus.Delivered]       = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.Delivered, EventType.Delivered],
            [ParcelStatus.FailedAttempt]   = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.DeliveryAttempted, EventType.DeliveryAttempted],
            [ParcelStatus.ReturnedToDepot] = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.Returned, EventType.HeldAtFacility],
            [ParcelStatus.Cancelled]       = [EventType.LabelCreated, EventType.Exception],
            [ParcelStatus.Exception]       = [EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility, EventType.Exception],
        };

        var parcels = new List<Parcel>();
        var seq = 1;

        foreach (var (depot, depotIndex) in depots.Select((v, i) => (v, i)))
        {
            zonesByDepot.TryGetValue(depot.Id, out var depotZones);
            depotZones ??= [];

            var statusPlan = GetStatusPlanForDepot(depotIndex);
            var statusOccurrences = new Dictionary<ParcelStatus, int>();

            foreach (var status in statusPlan)
            {
                statusOccurrences.TryGetValue(status, out var occ);
                occ++;
                statusOccurrences[status] = occ;

                // Assign zone and generate address inside that zone
                var zone = depotZones.Count > 0 ? depotZones[random.Next(depotZones.Count)] : null;
                var (recipientAddr, zip) = GenerateNycAddress(zone, gf, random);

                var shipper = shipperAddresses[random.Next(shipperAddresses.Count)];

                var assignedRouteId = SelectSeedRouteId(status, occ, depot.Id, zone?.Id, routesByDepot);

                Bin? currentBin = null;
                if (zone is not null && (status == ParcelStatus.Sorted || status == ParcelStatus.Staged)
                    && binsByZone.TryGetValue(zone.Id, out var zoneBins) && zoneBins.Count > 0)
                {
                    currentBin = zoneBins[random.Next(zoneBins.Count)];
                }

                var serviceType = serviceTypes[random.Next(serviceTypes.Length)];
                var parcelType = ParcelTypes[random.Next(ParcelTypes.Length)];
                var now = DateTimeOffset.UtcNow;
                var age = GetSeededStatusAgeHours(status, occ, depotIndex);
                var createdAt = now.AddHours(-(age + random.Next(12, 168)));
                var statusChangedAt = now.AddHours(-age);

                // Tracking events
                var trackingEvents = new List<TrackingEvent>();
                var descs = eventDescriptions[status];
                var types = eventTypesForStatus[status];
                var eventCount = Math.Min(descs.Length, types.Length);
                var timeline = Math.Max(0, (statusChangedAt - createdAt).TotalHours);
                var step = eventCount > 1 ? timeline / (eventCount - 1) : 0;

                for (var k = 0; k < eventCount; k++)
                {
                    var ts = k == eventCount - 1 ? statusChangedAt : createdAt.AddHours(step * k);
                    trackingEvents.Add(new TrackingEvent
                    {
                        Id = Guid.NewGuid(),
                        Timestamp = ts,
                        EventType = types[k],
                        Description = descs[k],
                        LocationCity = City,
                        LocationState = State,
                        LocationCountryCode = "US",
                        CreatedAt = ts,
                    });
                }

                var contentItems = Enumerable.Range(1, random.Next(1, 4)).Select(_ => new ParcelContentItem
                {
                    Id = Guid.NewGuid(),
                    HsCode = $"{random.Next(6000, 9999)}.{random.Next(10, 99)}",
                    Description = ContentDescriptions[random.Next(ContentDescriptions.Length)],
                    Quantity = random.Next(1, 5),
                    UnitValue = Math.Round((decimal)(random.NextDouble() * 200 + 5), 2),
                    Currency = "USD",
                    Weight = Math.Round((decimal)(random.NextDouble() * 5 + 0.1), 2),
                    WeightUnit = WeightUnit.Kg,
                    OriginCountryCode = "US",
                    CreatedAt = createdAt,
                }).ToList();

                parcels.Add(new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"LM-2026-{seq:D5}",
                    Description = $"{parcelType} shipment",
                    ServiceType = serviceType,
                    Status = status,
                    RecipientAddressId = recipientAddr.Id,
                    RecipientAddress = recipientAddr,
                    ShipperAddressId = shipper.Id,
                    ShipperAddress = shipper,
                    Weight = Math.Round((decimal)(random.NextDouble() * 20 + 0.5), 2),
                    WeightUnit = random.Next(2) == 0 ? WeightUnit.Kg : WeightUnit.Lb,
                    Length = random.Next(10, 80),
                    Width = random.Next(10, 60),
                    Height = random.Next(5, 40),
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = Math.Round((decimal)(random.NextDouble() * 500 + 10), 2),
                    Currency = "USD",
                    EstimatedDeliveryDate = createdAt.AddDays(random.Next(1, 7)),
                    ActualDeliveryDate = status == ParcelStatus.Delivered ? statusChangedAt : null,
                    DeliveryAttempts = status == ParcelStatus.FailedAttempt ? random.Next(1, 3) : 0,
                    ParcelType = parcelType,
                    ZoneId = zone?.Id,
                    CurrentBinId = currentBin?.Id,
                    RouteId = assignedRouteId,
                    CreatedAt = createdAt,
                    CurrentStatusChangedAt = statusChangedAt,
                    LastModifiedAt = statusChangedAt.AddMinutes(random.Next(15, 180)),
                });

                seq++;
            }
        }

        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} parcel records", parcels.Count);
    }

    // ── Sort Demo Parcels ────────────────────────────────────────────────

    private async Task SeedSortDemoParcelsAsync(CancellationToken cancellationToken)
    {
        const string prefix = "LM-SORT-";
        if (await dbContext.Parcels.AnyAsync(p => p.TrackingNumber.StartsWith(prefix), cancellationToken))
            return;

        var zones = await dbContext.Zones.Where(z => z.IsActive).OrderBy(z => z.Name).ToListAsync(cancellationToken);
        if (zones.Count == 0) return;

        var gf = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(42);

        var shipper = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Sort Demo Drive",
            City = City, State = State, PostalCode = "10001",
            CountryCode = "US", IsResidential = false,
            CompanyName = "Sort Demo Shipper Co",
            GeoLocation = gf.CreatePoint(new Coordinate(-73.985, 40.748)),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await dbContext.Addresses.AddAsync(shipper, cancellationToken);

        var parcels = new List<Parcel>();
        for (var i = 1; i <= 14; i++)
        {
            var zone = zones[(i - 1) % zones.Count];
            var (addr, _) = GenerateNycAddress(zone, gf, random);
            var now = DateTimeOffset.UtcNow;
            var createdAt = now.AddHours(-i * 3);

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"{prefix}{i:D5}",
                Description = "Sort demo shipment",
                ServiceType = ServiceType.Standard,
                Status = ParcelStatus.ReceivedAtDepot,
                RecipientAddressId = addr.Id, RecipientAddress = addr,
                ShipperAddressId = shipper.Id, ShipperAddress = shipper,
                Weight = Math.Round(1.5m + i * 0.3m, 1), WeightUnit = WeightUnit.Kg,
                Length = 20, Width = 15, Height = 10, DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = 50m + i * 10m, Currency = "USD",
                EstimatedDeliveryDate = now.AddDays(3), ParcelType = "Standard",
                ZoneId = zone.Id,
                CreatedAt = createdAt,
                CurrentStatusChangedAt = createdAt.AddHours(1),
                LastModifiedAt = createdAt.AddHours(1),
            };

            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = createdAt,
                EventType = EventType.LabelCreated, Description = "Label created and registered",
                LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = createdAt,
            });
            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = createdAt.AddHours(1),
                EventType = EventType.ArrivedAtFacility, Description = "Package received at depot",
                LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = createdAt.AddHours(1),
            });

            parcels.Add(parcel);
        }

        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} sort demo parcels", parcels.Count);
    }

    // ── Route-Ready Parcels ─────────────────────────────────────────────

    private async Task SeedRouteReadyParcelsAsync(CancellationToken cancellationToken)
    {
        const string prefix = "LM-RT-";
        if (await dbContext.Parcels.AnyAsync(p => p.TrackingNumber.StartsWith(prefix), cancellationToken))
            return;

        var zones = await dbContext.Zones
            .Where(z => z.IsActive)
            .Include(z => z.Depot).ThenInclude(d => d!.Address)
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);
        if (zones.Count == 0) return;

        var binsByZone = await dbContext.Bins.AsNoTracking()
            .Include(b => b.Aisle)
            .Where(b => b.IsActive && b.Aisle.IsActive)
            .GroupBy(b => b.Aisle.ZoneId)
            .ToDictionaryAsync(g => g.Key, g => g.OrderBy(b => b.Code).ToList(), cancellationToken);

        var gf = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(123);
        var serviceTypes = Enum.GetValues<ServiceType>();

        var shipperByZone = new Dictionary<Guid, Address>();
        foreach (var zone in zones)
        {
            if (shipperByZone.ContainsKey(zone.Id)) continue;
            var (addr, _) = GenerateNycAddress(zone, gf, random, isShipper: true);
            addr.CompanyName = $"{zone.Name} Supplies";
            shipperByZone[zone.Id] = addr;
        }

        await dbContext.Addresses.AddRangeAsync(shipperByZone.Values, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var parcelsPerZone = 25;
        var parcels = new List<Parcel>();
        var seq = 1;

        foreach (var zone in zones)
        {
            var shipper = shipperByZone[zone.Id];
            Bin? zoneBin = binsByZone.TryGetValue(zone.Id, out var zb) && zb.Count > 0 ? zb[0] : null;

            for (var i = 0; i < parcelsPerZone; i++)
            {
                var (addr, _) = GenerateNycAddress(zone, gf, random);
                var now = DateTimeOffset.UtcNow;
                var createdAt = now.AddHours(-random.Next(2, 48));
                var parcelType = ParcelTypes[random.Next(ParcelTypes.Length)];

                var parcel = new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"{prefix}{seq:D5}",
                    Description = $"{parcelType} shipment for route testing",
                    ServiceType = serviceTypes[random.Next(serviceTypes.Length)],
                    Status = ParcelStatus.Sorted,
                    RecipientAddressId = addr.Id, RecipientAddress = addr,
                    ShipperAddressId = shipper.Id, ShipperAddress = shipper,
                    Weight = Math.Round((decimal)(random.NextDouble() * 15 + 0.5), 2),
                    WeightUnit = random.Next(2) == 0 ? WeightUnit.Kg : WeightUnit.Lb,
                    Length = random.Next(10, 60), Width = random.Next(10, 40), Height = random.Next(5, 30),
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = Math.Round((decimal)(random.NextDouble() * 300 + 10), 2),
                    Currency = "USD",
                    EstimatedDeliveryDate = now.AddDays(random.Next(1, 5)),
                    ParcelType = parcelType,
                    ZoneId = zone.Id,
                    CurrentBinId = zoneBin?.Id,
                    CreatedAt = createdAt,
                    CurrentStatusChangedAt = createdAt.AddHours(2),
                    LastModifiedAt = createdAt.AddHours(2),
                };

                parcel.TrackingEvents.Add(new TrackingEvent
                {
                    Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = createdAt,
                    EventType = EventType.LabelCreated, Description = "Label created and registered",
                    LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = createdAt,
                });
                parcel.TrackingEvents.Add(new TrackingEvent
                {
                    Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = createdAt.AddHours(1),
                    EventType = EventType.ArrivedAtFacility, Description = "Package received at depot",
                    LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = createdAt.AddHours(1),
                });
                parcel.TrackingEvents.Add(new TrackingEvent
                {
                    Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = createdAt.AddHours(2),
                    EventType = EventType.HeldAtFacility, Description = "Package sorted to zone",
                    LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = createdAt.AddHours(2),
                });

                parcels.Add(parcel);
                seq++;
            }
        }

        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} route-ready parcels across {ZoneCount} zones", parcels.Count, zones.Count);
    }

    // ── Route-Parcel Assignments ─────────────────────────────────────────

    private async Task SeedRouteParcelAssignmentsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.RouteParcels.AnyAsync(cancellationToken))
            return;

        var allRoutes = await dbContext.DeliveryRoutes.ToListAsync(cancellationToken);
        if (allRoutes.Count == 0) return;

        var routeReadyParcels = await dbContext.Parcels
            .Where(p => p.TrackingNumber.StartsWith("LM-RT-") && p.Status == ParcelStatus.Sorted)
            .ToListAsync(cancellationToken);
        if (routeReadyParcels.Count == 0) return;

        var routeParcels = new List<RouteParcel>();
        var parcelsByZone = routeReadyParcels.GroupBy(p => p.ZoneId).ToDictionary(g => g.Key, g => g.ToList());
        var assigned = new HashSet<Guid>();
        var random = new Random(77);

        foreach (var route in allRoutes)
        {
            if (!parcelsByZone.TryGetValue(route.ZoneId, out var zoneParcels)) continue;

            var available = zoneParcels.Where(p => !assigned.Contains(p.Id)).Take(6).ToList();
            if (available.Count == 0) continue;

            for (var i = 0; i < available.Count; i++)
            {
                var parcel = available[i];
                routeParcels.Add(new RouteParcel
                {
                    RouteId = route.Id,
                    ParcelId = parcel.Id,
                    StopOrder = i + 1,
                    AddedAt = DateTimeOffset.UtcNow,
                });
                assigned.Add(parcel.Id);
                parcel.RouteId = route.Id;

                // Transition parcel status to match route status
                switch (route.Status)
                {
                    case RouteStatus.Draft:
                        // Keep as Sorted — will be transitioned when dispatched
                        break;
                    case RouteStatus.Dispatched:
                        parcel.TransitionToStatus(ParcelStatus.Staged);
                        parcel.TransitionToStatus(ParcelStatus.Loaded);
                        parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                        break;
                    case RouteStatus.InProgress:
                        var inProgRoll = random.Next(10);
                        if (inProgRoll < 6)
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                        }
                        else if (inProgRoll < 9)
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                            parcel.TransitionToStatus(ParcelStatus.Delivered);
                        }
                        else
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                            parcel.TransitionToStatus(ParcelStatus.FailedAttempt);
                        }
                        break;
                    case RouteStatus.Completed:
                        var completedRoll = random.Next(10);
                        if (completedRoll < 7)
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                            parcel.TransitionToStatus(ParcelStatus.Delivered);
                        }
                        else if (completedRoll < 9)
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                            parcel.TransitionToStatus(ParcelStatus.FailedAttempt);
                        }
                        else
                        {
                            parcel.TransitionToStatus(ParcelStatus.Staged);
                            parcel.TransitionToStatus(ParcelStatus.Loaded);
                            parcel.TransitionToStatus(ParcelStatus.OutForDelivery);
                            parcel.TransitionToStatus(ParcelStatus.FailedAttempt);
                            parcel.TransitionToStatus(ParcelStatus.ReturnedToDepot);
                        }
                        break;
                }
            }

            route.EstimatedStops = available.Count;
        }

        await dbContext.RouteParcels.AddRangeAsync(routeParcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} route-parcel assignments across {RouteCount} routes (all statuses)", routeParcels.Count, allRoutes.Count);
    }

    // ── Inbound Manifests ────────────────────────────────────────────────

    private async Task SeedInboundManifestsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.InboundManifests.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.OrderBy(d => d.Name).ToListAsync(cancellationToken);
        var zones = await dbContext.Zones.OrderBy(z => z.Name).ToListAsync(cancellationToken);
        var zonesByDepot = zones.GroupBy(z => z.DepotId).ToDictionary(g => g.Key, g => g.ToList());
        if (depots.Count == 0) return;

        var gf = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(99);

        var shipper = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "500 Manifest Way",
            City = City, State = State, PostalCode = "10001",
            CountryCode = "US", IsResidential = false,
            CompanyName = "NYC Manifest Shipper",
            GeoLocation = gf.CreatePoint(new Coordinate(-73.985, 40.748)),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await dbContext.Addresses.AddAsync(shipper, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var allParcels = new List<Parcel>();
        var allManifests = new List<InboundManifest>();
        var manifestSeq = 1;
        var now = DateTimeOffset.UtcNow;
        var perDepot = 20;

        foreach (var depot in depots)
        {
            zonesByDepot.TryGetValue(depot.Id, out var depotZones);
            depotZones ??= [];

            var created = 0;
            var manifestParcels = new List<Parcel>();

            while (created < perDepot)
            {
                var zone = depotZones.Count > 0 ? depotZones[random.Next(depotZones.Count)] : null;
                var (addr, _) = GenerateNycAddress(zone, gf, random);

                var parcel = new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"LM-MFT-{manifestSeq:D5}-{created + 1:D2}",
                    BarcodeData = $"LM-MFT-{manifestSeq:D5}-{created + 1:D2}",
                    Description = "Inbound manifest parcel",
                    ServiceType = ServiceType.Standard,
                    Status = ParcelStatus.Registered,
                    RecipientAddressId = addr.Id, RecipientAddress = addr,
                    ShipperAddressId = shipper.Id, ShipperAddress = shipper,
                    Weight = Math.Round((decimal)(random.NextDouble() * 15 + 0.5), 2),
                    WeightUnit = WeightUnit.Kg,
                    Length = random.Next(15, 60), Width = random.Next(10, 40), Height = random.Next(5, 30),
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = Math.Round((decimal)(random.NextDouble() * 300 + 10), 2),
                    Currency = "USD", ParcelType = "Standard",
                    ZoneId = zone?.Id, DeliveryAttempts = 0,
                    CreatedAt = now, CurrentStatusChangedAt = now,
                };

                parcel.TrackingEvents.Add(new TrackingEvent
                {
                    Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = now,
                    EventType = EventType.LabelCreated, Description = "Label created and registered",
                    LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = now,
                });

                allParcels.Add(parcel);
                manifestParcels.Add(parcel);
                created++;

                var max = random.Next(6, 10);
                if (manifestParcels.Count >= max || created >= perDepot)
                {
                    allManifests.Add(new InboundManifest
                    {
                        Id = Guid.NewGuid(),
                        ManifestNumber = $"MFT-{now:yyyyMMdd}-{manifestSeq:D3}",
                        DepotId = depot.Id,
                        Status = manifestParcels.Count >= max ? InboundManifestStatus.Sealed : InboundManifestStatus.Open,
                        MaxParcels = max,
                        Parcels = manifestParcels.ToList(),
                        CreatedAt = now,
                    });
                    manifestSeq++;
                    manifestParcels.Clear();
                }
            }
        }

        // Walk-in parcels
        for (var w = 0; w < 4; w++)
        {
            var depot = depots[w % depots.Count];
            zonesByDepot.TryGetValue(depot.Id, out var dz);
            var zone = dz?.Count > 0 ? dz[w % dz.Count] : null;
            var (addr, _) = GenerateNycAddress(zone, gf, random);

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"LM-WALK-{w + 1:D5}",
                BarcodeData = $"LM-WALK-{w + 1:D5}",
                Description = "Walk-in parcel (no manifest)",
                ServiceType = ServiceType.Express,
                Status = ParcelStatus.Registered,
                RecipientAddressId = addr.Id, RecipientAddress = addr,
                ShipperAddressId = shipper.Id, ShipperAddress = shipper,
                Weight = Math.Round((decimal)(random.NextDouble() * 5 + 0.5), 2),
                WeightUnit = WeightUnit.Kg,
                Length = 20, Width = 15, Height = 10, DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = Math.Round((decimal)(random.NextDouble() * 100 + 10), 2),
                Currency = "USD", ParcelType = "Express",
                ZoneId = zone?.Id, DeliveryAttempts = 0,
                CreatedAt = now, CurrentStatusChangedAt = now,
            };

            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(), ParcelId = parcel.Id, Timestamp = now,
                EventType = EventType.LabelCreated, Description = "Label created and registered",
                LocationCity = City, LocationState = State, LocationCountryCode = "US", CreatedAt = now,
            });

            allParcels.Add(parcel);
        }

        await dbContext.Parcels.AddRangeAsync(allParcels, cancellationToken);
        await dbContext.InboundManifests.AddRangeAsync(allManifests, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {ParcelCount} inbound parcels in {ManifestCount} manifests + 4 walk-in parcels",
            allParcels.Count, allManifests.Count);
    }

    // ── Users (roles, admin, ops, warehouse managers, dispatcher, depot operators) ──

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in RoleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new AppRole(roleName));
                if (result.Succeeded) logger.LogInformation("Created role: {Role}", roleName);
                else logger.LogError("Failed to create role {Role}: {Errors}", roleName, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    private async Task SeedAdminUserAsync()
    {
        var email = configuration["Seeding:AdminEmail"] ?? "admin@lastmile.local";
        if (await userManager.FindByEmailAsync(email) != null) return;

        var user = new AppUser
        {
            Id = Guid.NewGuid(), UserName = email, Email = email, EmailConfirmed = true,
            FirstName = configuration["Seeding:AdminFirstName"] ?? "System",
            LastName = configuration["Seeding:AdminLastName"] ?? "Administrator",
            Role = UserRole.Admin, IsActive = true, CreatedAt = DateTimeOffset.UtcNow,
        };

        var createResult = await userManager.CreateAsync(user, configuration["Seeding:AdminPassword"] ?? "Admin@123456");
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(user, nameof(UserRole.Admin));
            logger.LogInformation("Admin user seeded: {Email}", email);
        }
    }

    private async Task SeedOperationsManagerUserAsync()
    {
        var email = configuration["Seeding:OpsEmail"] ?? "ops@lastmile.local";
        if (await userManager.FindByEmailAsync(email) != null) return;

        var user = new AppUser
        {
            Id = Guid.NewGuid(), UserName = email, Email = email, EmailConfirmed = true,
            FirstName = "Operations", LastName = "Manager",
            Role = UserRole.OperationsManager, IsActive = true, CreatedAt = DateTimeOffset.UtcNow,
        };

        var createResult = await userManager.CreateAsync(user, configuration["Seeding:OpsPassword"] ?? "Ops@123456");
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(user, nameof(UserRole.OperationsManager));
            logger.LogInformation("Operations Manager user seeded: {Email}", email);
        }
    }

    private async Task SeedWarehouseManagerUsersAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots.OrderBy(d => d.Name).Select(d => new { d.Id, d.Name }).ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var managers = new[]
        {
            new { Email = "warehouse.manager@lastmile.local", Password = "Warehouse@123456", First = "Warehouse", Last = "Manager", DepotIdx = 0 },
            new { Email = "warehouse.manager2@lastmile.local", Password = "Warehouse2@123456", First = "Warehouse", Last = "Manager Two", DepotIdx = 1 },
        };

        foreach (var m in managers)
        {
            if (await userManager.FindByEmailAsync(m.Email) != null) continue;
            var depot = depots[Math.Min(m.DepotIdx, depots.Count - 1)];

            var user = new AppUser
            {
                Id = Guid.NewGuid(), UserName = m.Email, Email = m.Email, EmailConfirmed = true,
                FirstName = m.First, LastName = m.Last,
                Role = UserRole.WarehouseManager, AssignedDepotId = depot.Id,
                IsActive = true, CreatedAt = DateTimeOffset.UtcNow,
            };

            var createResult = await userManager.CreateAsync(user, m.Password);
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(user, nameof(UserRole.WarehouseManager));
                logger.LogInformation("Warehouse Manager seeded: {Email} for {Depot}", m.Email, depot.Name);
            }
        }
    }

    private async Task SeedDispatcherUserAsync()
    {
        var email = configuration["Seeding:DispatcherEmail"] ?? "dispatcher@lastmile.local";
        if (await userManager.FindByEmailAsync(email) != null) return;

        var user = new AppUser
        {
            Id = Guid.NewGuid(), UserName = email, Email = email, EmailConfirmed = true,
            FirstName = "Dispatch", LastName = "Coordinator",
            Role = UserRole.Dispatcher, IsActive = true, CreatedAt = DateTimeOffset.UtcNow,
        };

        var createResult = await userManager.CreateAsync(user, configuration["Seeding:DispatcherPassword"] ?? "Dispatcher@123456");
        if (createResult.Succeeded)
        {
            await userManager.AddToRoleAsync(user, nameof(UserRole.Dispatcher));
            logger.LogInformation("Dispatcher user seeded: {Email}", email);
        }
    }

    private async Task SeedDepotOperatorUsersAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots.OrderBy(d => d.Name).Select(d => new { d.Id, d.Name }).ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        for (var i = 0; i < Math.Min(4, depots.Count); i++)
        {
            var email = $"depot.operator{i + 1}@lastmile.local";
            if (await userManager.FindByEmailAsync(email) != null) continue;

            var user = new AppUser
            {
                Id = Guid.NewGuid(), UserName = email, Email = email, EmailConfirmed = true,
                FirstName = "Depot", LastName = $"Operator {i + 1}",
                Role = UserRole.DepotOperator, AssignedDepotId = depots[i].Id,
                IsActive = true, CreatedAt = DateTimeOffset.UtcNow,
            };

            var createResult = await userManager.CreateAsync(user, $"DepotOp{i + 1}@123456");
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(user, nameof(UserRole.DepotOperator));
                logger.LogInformation("Depot Operator seeded: {Email} for {Depot}", email, depots[i].Name);
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static OperatingHours WeekdaySchedule() => new()
    {
        Schedule =
        [
            new DailyAvailability { DayOfWeek = "Monday",    StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
            new DailyAvailability { DayOfWeek = "Tuesday",   StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
            new DailyAvailability { DayOfWeek = "Wednesday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
            new DailyAvailability { DayOfWeek = "Thursday",  StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
            new DailyAvailability { DayOfWeek = "Friday",    StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
        ],
        DaysOff = [],
    };

    /// <summary>
    /// Generate a random NYC address. If a zone is provided with a polygon boundary,
    /// the geolocation will be placed inside the zone. Otherwise, falls back to a
    /// random point in the broader NYC area.
    /// </summary>
    private static (Address Address, string Zip) GenerateNycAddress(Zone? zone, GeometryFactory gf, Random random, bool isShipper = false)
    {
        double lon, lat;

        if (zone?.Boundary is Polygon poly && poly.EnvelopeInternal is { } env)
        {
            // Place inside zone boundary (with small margin)
            var margin = 0.002;
            lon = env.MinX + margin + random.NextDouble() * (env.Width - 2 * margin);
            lat = env.MinY + margin + random.NextDouble() * (env.Height - 2 * margin);
        }
        else
        {
            // Fallback: random point in broader NYC (full extent: SI to Bronx, JFK to Bayonne)
            lon = -74.26 + random.NextDouble() * 0.56;
            lat = 40.50 + random.NextDouble() * 0.42;
        }

        var zip = $"{10001 + random.Next(0, 120)}";
        var streetNum = random.Next(10, 9999);
        var streetName = NycStreetNames[random.Next(NycStreetNames.Length)];
        var suffix = StreetSuffixes[random.Next(StreetSuffixes.Length)];

        return (new Address
        {
            Id = Guid.NewGuid(),
            Street1 = $"{streetNum} {streetName} {suffix}",
            City = City,
            State = State,
            PostalCode = zip,
            CountryCode = "US",
            IsResidential = !isShipper && random.Next(2) == 0,
            ContactName = isShipper ? null : $"{FirstNames[random.Next(FirstNames.Length)]} {LastNames[random.Next(LastNames.Length)]}",
            Phone = isShipper ? null : $"1212-{random.Next(100, 999):D3}-{random.Next(1000, 9999):D4}",
            GeoLocation = gf.CreatePoint(new Coordinate(lon, lat)),
            CreatedAt = DateTimeOffset.UtcNow,
        }, zip);
    }

    private static Guid? SelectSeedRouteId(
        ParcelStatus status,
        int statusOccurrenceIndex,
        Guid depotId,
        Guid? zoneId,
        IReadOnlyDictionary<Guid, List<DeliveryRoute>> routesByDepotId)
    {
        // Assign route for Staged and Loaded parcels
        if (status is not (ParcelStatus.Staged or ParcelStatus.Loaded or ParcelStatus.OutForDelivery
            or ParcelStatus.Delivered or ParcelStatus.FailedAttempt or ParcelStatus.ReturnedToDepot))
            return null;

        if (statusOccurrenceIndex % 2 == 0) return null;

        if (!routesByDepotId.TryGetValue(depotId, out var depotRoutes) || depotRoutes.Count == 0)
            return null;

        var matching = zoneId.HasValue
            ? depotRoutes.Where(r => r.ZoneId == zoneId.Value).ToList()
            : depotRoutes;

        if (matching.Count == 0) matching = depotRoutes;

        return matching[(statusOccurrenceIndex - 1) % matching.Count].Id;
    }

    private static ParcelStatus[] GetStatusPlanForDepot(int depotIndex) => (depotIndex % 4) switch
    {
        0 =>
        [
            ParcelStatus.Registered,
            ParcelStatus.Registered,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
            ParcelStatus.OutForDelivery,
            ParcelStatus.Delivered,
            ParcelStatus.Delivered,
            ParcelStatus.FailedAttempt,
            ParcelStatus.FailedAttempt,
            ParcelStatus.ReturnedToDepot,
            ParcelStatus.Cancelled,
            ParcelStatus.Exception,
            ParcelStatus.Exception,
        ],
        1 =>
        [
            ParcelStatus.Registered,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.Loaded,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
            ParcelStatus.Delivered,
            ParcelStatus.Delivered,
            ParcelStatus.Delivered,
            ParcelStatus.FailedAttempt,
            ParcelStatus.ReturnedToDepot,
            ParcelStatus.Cancelled,
            ParcelStatus.Exception,
        ],
        2 =>
        [
            ParcelStatus.Registered,
            ParcelStatus.Registered,
            ParcelStatus.Registered,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
            ParcelStatus.OutForDelivery,
            ParcelStatus.Delivered,
            ParcelStatus.FailedAttempt,
            ParcelStatus.FailedAttempt,
            ParcelStatus.ReturnedToDepot,
            ParcelStatus.Cancelled,
            ParcelStatus.Exception,
            ParcelStatus.Exception,
            ParcelStatus.Exception,
        ],
        _ =>
        [
            ParcelStatus.Registered,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
            ParcelStatus.Delivered,
            ParcelStatus.Delivered,
            ParcelStatus.Delivered,
            ParcelStatus.FailedAttempt,
            ParcelStatus.ReturnedToDepot,
            ParcelStatus.Cancelled,
            ParcelStatus.Exception,
        ],
    };

    private static double GetSeededStatusAgeHours(ParcelStatus status, int occ, int depotIndex)
    {
        var age = (depotIndex % 4, status) switch
        {
            (_, ParcelStatus.Registered)      => 5d + occ * 12,
            (_, ParcelStatus.ReceivedAtDepot) => 8d + occ * 15,
            (_, ParcelStatus.Sorted)          => 6d + occ * 10,
            (_, ParcelStatus.Staged)          => 4d + occ * 12,
            (_, ParcelStatus.Loaded)          => 5d + occ * 14,
            (_, ParcelStatus.OutForDelivery)  => 3d + occ * 8,
            (_, ParcelStatus.Delivered)       => 10d + occ * 20,
            (_, ParcelStatus.FailedAttempt)   => 15d + occ * 25,
            (_, ParcelStatus.ReturnedToDepot) => 40d,
            (_, ParcelStatus.Cancelled)       => 18d,
            (_, ParcelStatus.Exception)       => 14d + occ * 20,
            _ => 24d,
        };
        return age;
    }
}
