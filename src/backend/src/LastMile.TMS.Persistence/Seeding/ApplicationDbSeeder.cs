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

public class ApplicationDbSeeder(
    AppDbContext dbContext,
    UserManager<AppUser> userManager,
    RoleManager<AppRole> roleManager,
    IConfiguration configuration,
    ILogger<ApplicationDbSeeder> logger) : IDbSeeder
{
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
        await SeedInboundManifestsAsync(cancellationToken);
    }

    private async Task SeedDepotsAsync(CancellationToken cancellationToken)
    {
        var existingDepotNames = await dbContext.Depots
            .Select(d => d.Name)
            .ToHashSetAsync(cancellationToken);

        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        var depotsToSeed = CreateSeedDepots(geometryFactory)
            .Where(depot => !existingDepotNames.Contains(depot.Name))
            .ToList();

        if (depotsToSeed.Count == 0)
            return;

        var addresses = depotsToSeed.Select(depot => depot.Address).ToList();

        await dbContext.Addresses.AddRangeAsync(addresses, cancellationToken);
        await dbContext.Depots.AddRangeAsync(depotsToSeed, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {Count} depot records", depotsToSeed.Count);
    }

    private async Task SeedVehiclesAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Vehicles.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var vehicles = new List<Vehicle>();
        var random = new Random(42);
        var states = new[] { "TN", "KY", "AL" };
        var plateLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        for (var i = 0; i < 25; i++)
        {
            var depot = depots[i % depots.Count];
            var state = states[i % states.Length];
            var type = (VehicleType)(i % 3); // Van, Car, Bike rotation
            var status = i < 18 ? VehicleStatus.Available
                : i < 22 ? VehicleStatus.InUse
                : VehicleStatus.Maintenance;

            var parcelCapacity = type switch
            {
                VehicleType.Van => random.Next(40, 80),
                VehicleType.Car => random.Next(15, 40),
                VehicleType.Bike => random.Next(1, 10),
                _ => random.Next(20, 60)
            };

            var weightCapacity = type switch
            {
                VehicleType.Van => random.Next(500, 1000),
                VehicleType.Car => random.Next(200, 500),
                VehicleType.Bike => random.Next(10, 50),
                _ => random.Next(100, 500)
            };

            var plate = $"{state}-{plateLetters[random.Next(26)]}{plateLetters[random.Next(26)]}{plateLetters[random.Next(26)]}-{random.Next(100, 999)}";

            vehicles.Add(new Vehicle
            {
                Id = Guid.NewGuid(),
                RegistrationPlate = plate,
                Type = type,
                Status = status,
                ParcelCapacity = parcelCapacity,
                WeightCapacity = weightCapacity,
                WeightUnit = WeightUnit.Kg,
                DepotId = depot.Id,
                Depot = depot,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        await dbContext.Vehicles.AddRangeAsync(vehicles, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} vehicle records", vehicles.Count);
    }

    private static List<Depot> CreateSeedDepots(GeometryFactory geometryFactory)
    {
        return
        [
            CreateDepot(
                name: "Central Hub",
                street1: "101 Logistics Way",
                city: "Nashville",
                state: "TN",
                postalCode: "37211",
                lon: -86.78,
                lat: 36.17,
                geometryFactory),
            CreateDepot(
                name: "North Distribution Center",
                street1: "2200 Commerce Drive",
                city: "Louisville",
                state: "KY",
                postalCode: "40216",
                lon: -85.74,
                lat: 38.25,
                geometryFactory),
            CreateDepot(
                name: "South Fleet Yard",
                street1: "850 Industrial Park Rd",
                city: "Birmingham",
                state: "AL",
                postalCode: "35210",
                lon: -86.80,
                lat: 33.45,
                geometryFactory)
        ];
    }

    private static Depot CreateDepot(
        string name,
        string street1,
        string city,
        string state,
        string postalCode,
        double lon,
        double lat,
        GeometryFactory geometryFactory)
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
            GeoLocation = geometryFactory.CreatePoint(new Coordinate(lon, lat)),
            CreatedAt = DateTimeOffset.UtcNow
        };

        return new Depot
        {
            Id = Guid.NewGuid(),
            Name = name,
            AddressId = address.Id,
            Address = address,
            IsActive = true,
            OperatingHours = new OperatingHours
            {
                Schedule =
                [
                    new DailyAvailability { DayOfWeek = "Monday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
                    new DailyAvailability { DayOfWeek = "Tuesday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
                    new DailyAvailability { DayOfWeek = "Wednesday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
                    new DailyAvailability { DayOfWeek = "Thursday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) },
                    new DailyAvailability { DayOfWeek = "Friday", StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(17, 0) }
                ],
                DaysOff = []
            },
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private async Task SeedDriversAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Drivers.AnyAsync(cancellationToken))
            return;

        var depotIds = await dbContext.Depots
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync(cancellationToken);

        Guid? centralId = depotIds.FirstOrDefault(d => d.Name == "Central Hub")?.Id;
        Guid? northId = depotIds.FirstOrDefault(d => d.Name == "North Distribution Center")?.Id;
        Guid? southId = depotIds.FirstOrDefault(d => d.Name == "South Fleet Yard")?.Id;

        var drivers = new List<Driver>
        {
            // Central Hub drivers
            CreateDriver("James",   "Carter",    "+16155550101", "j.carter@lastmile.local",    "TN-DL-884521", 2, centralId, WeekdaySchedule()),
            CreateDriver("Maria",   "Gonzalez",  "+16155550102", "m.gonzalez@lastmile.local",  "TN-DL-221047", 3, centralId, WeekdaySchedule()),
            CreateDriver("Kyle",    "Brooks",    "+16155550105", "k.brooks@lastmile.local",    "TN-DL-557834", 4, centralId, WeekdaySchedule(), isActive: false),
            CreateDriver("Ethan",   "Harris",    "+16155550106", "e.harris@lastmile.local",    "TN-DL-661230", 2, centralId, WeekdaySchedule()),
            CreateDriver("Olivia",  "Martin",    "+16155550107", "o.martin@lastmile.local",    "TN-DL-772341", 3, centralId, ShiftTwoSchedule()),
            CreateDriver("Liam",    "Thompson",  "+16155550108", "l.thompson@lastmile.local",  "TN-DL-883452", 1, centralId, WeekdaySchedule()),
            CreateDriver("Sophia",  "Anderson",  "+16155550109", "s.anderson@lastmile.local",  "TN-DL-994563", 2, centralId, ShiftTwoSchedule()),
            CreateDriver("Noah",    "Jackson",   "+16155550110", "n.jackson@lastmile.local",   "TN-DL-105674", 4, centralId, WeekdaySchedule()),
            CreateDriver("Emma",    "White",     "+16155550111", "e.white@lastmile.local",     "TN-DL-216785", 3, centralId, WeekdaySchedule(), isActive: false),
            CreateDriver("Mason",   "Taylor",    "+16155550112", "m.taylor@lastmile.local",    "TN-DL-327896", 2, centralId, WeekdaySchedule()),
            CreateDriver("Ava",     "Moore",     "+16155550113", "a.moore@lastmile.local",     "TN-DL-438907", 1, centralId, ShiftTwoSchedule()),
            CreateDriver("Lucas",   "Lee",       "+16155550114", "l.lee@lastmile.local",       "TN-DL-549018", 2, centralId, WeekdaySchedule()),
            CreateDriver("Isabella","Clark",     "+16155550115", "i.clark@lastmile.local",     "TN-DL-650129", 3, centralId, WeekdaySchedule()),
            CreateDriver("Logan",   "Lewis",     "+16155550116", "l.lewis@lastmile.local",     "TN-DL-761230", 4, centralId, ShiftTwoSchedule()),
            CreateDriver("Mia",     "Robinson",  "+16155550117", "m.robinson@lastmile.local",  "TN-DL-872341", 2, centralId, WeekdaySchedule()),
            // North Distribution Center drivers
            CreateDriver("Darius",  "Webb",      "+15025550103", "d.webb@lastmile.local",      "KY-DL-330192", 1, northId,   ShiftTwoSchedule()),
            CreateDriver("Grace",   "Walker",    "+15025550118", "g.walker@lastmile.local",    "KY-DL-441203", 2, northId,   WeekdaySchedule()),
            CreateDriver("Henry",   "Hall",      "+15025550119", "h.hall@lastmile.local",      "KY-DL-552314", 3, northId,   ShiftTwoSchedule()),
            CreateDriver("Chloe",   "Allen",     "+15025550120", "c.allen@lastmile.local",     "KY-DL-663425", 1, northId,   WeekdaySchedule(), isActive: false),
            CreateDriver("Jack",    "Young",     "+15025550121", "j.young@lastmile.local",     "KY-DL-774536", 2, northId,   WeekdaySchedule()),
            CreateDriver("Lily",    "Hernandez", "+15025550122", "l.hernandez@lastmile.local", "KY-DL-885647", 4, northId,   ShiftTwoSchedule()),
            CreateDriver("Oliver",  "King",      "+15025550123", "o.king@lastmile.local",      "KY-DL-996758", 3, northId,   WeekdaySchedule()),
            CreateDriver("Ella",    "Wright",    "+15025550124", "e.wright@lastmile.local",    "KY-DL-107869", 2, northId,   ShiftTwoSchedule()),
            CreateDriver("James",   "Lopez",     "+15025550125", "j.lopez@lastmile.local",     "KY-DL-218970", 1, northId,   WeekdaySchedule()),
            CreateDriver("Harper",  "Hill",      "+15025550126", "h.hill@lastmile.local",      "KY-DL-329081", 2, northId,   WeekdaySchedule()),
            CreateDriver("Aiden",   "Scott",     "+15025550127", "a.scott@lastmile.local",     "KY-DL-430192", 3, northId,   ShiftTwoSchedule()),
            CreateDriver("Scarlett","Green",     "+15025550128", "s.green@lastmile.local",     "KY-DL-541203", 4, northId,   WeekdaySchedule()),
            CreateDriver("Elijah",  "Adams",     "+15025550129", "e.adams@lastmile.local",     "KY-DL-652314", 2, northId,   ShiftTwoSchedule(), isActive: false),
            CreateDriver("Riley",   "Baker",     "+15025550130", "r.baker@lastmile.local",     "KY-DL-763425", 1, northId,   WeekdaySchedule()),
            CreateDriver("Grayson", "Gonzalez",  "+15025550131", "g.gonzalez@lastmile.local",  "KY-DL-874536", 3, northId,   WeekdaySchedule()),
            // South Fleet Yard drivers
            CreateDriver("Priya",   "Sharma",    "+12055550104", "p.sharma@lastmile.local",    "AL-DL-119843", 2, southId,   new OperatingHours { Schedule = [], DaysOff = [] }),
            CreateDriver("Sofia",   "Nelson",    "+12055550132", "s.nelson@lastmile.local",    "AL-DL-220954", 3, southId,   WeekdaySchedule()),
            CreateDriver("Carter",  "Carter",    "+12055550133", "c.carter@lastmile.local",    "AL-DL-331065", 2, southId,   ShiftTwoSchedule()),
            CreateDriver("Zoe",     "Mitchell",  "+12055550134", "z.mitchell@lastmile.local",  "AL-DL-442176", 1, southId,   WeekdaySchedule()),
            CreateDriver("Julian",  "Perez",     "+12055550135", "j.perez@lastmile.local",     "AL-DL-553287", 4, southId,   ShiftTwoSchedule()),
            CreateDriver("Penelope","Roberts",   "+12055550136", "p.roberts@lastmile.local",   "AL-DL-664398", 2, southId,   WeekdaySchedule()),
            CreateDriver("Wyatt",   "Turner",    "+12055550137", "w.turner@lastmile.local",    "AL-DL-775409", 3, southId,   ShiftTwoSchedule(), isActive: false),
            CreateDriver("Nora",    "Phillips",  "+12055550138", "n.phillips@lastmile.local",  "AL-DL-886510", 1, southId,   WeekdaySchedule()),
            CreateDriver("Lincoln", "Campbell",  "+12055550139", "l.campbell@lastmile.local",  "AL-DL-997621", 2, southId,   WeekdaySchedule()),
            CreateDriver("Hannah",  "Parker",    "+12055550140", "h.parker@lastmile.local",    "AL-DL-108732", 4, southId,   ShiftTwoSchedule()),
            CreateDriver("Josiah",  "Evans",     "+12055550141", "j.evans@lastmile.local",     "AL-DL-219843", 3, southId,   WeekdaySchedule()),
            CreateDriver("Layla",   "Edwards",   "+12055550142", "l.edwards@lastmile.local",   "AL-DL-320954", 2, southId,   ShiftTwoSchedule()),
            CreateDriver("Mateo",   "Collins",   "+12055550143", "m.collins@lastmile.local",   "AL-DL-431065", 1, southId,   WeekdaySchedule()),
            CreateDriver("Aubrey",  "Stewart",   "+12055550144", "a.stewart@lastmile.local",   "AL-DL-542176", 2, southId,   WeekdaySchedule()),
            CreateDriver("Hunter",  "Sanchez",   "+12055550145", "h.sanchez@lastmile.local",   "AL-DL-653287", 3, southId,   ShiftTwoSchedule()),
        };

        await dbContext.Drivers.AddRangeAsync(drivers, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {Count} driver records", drivers.Count);
    }

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
        DaysOff = []
    };

    private static OperatingHours ShiftTwoSchedule() => new()
    {
        Schedule =
        [
            new DailyAvailability { DayOfWeek = "Monday",    StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(22, 0) },
            new DailyAvailability { DayOfWeek = "Tuesday",   StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(22, 0) },
            new DailyAvailability { DayOfWeek = "Wednesday", StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(22, 0) },
            new DailyAvailability { DayOfWeek = "Thursday",  StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(22, 0) },
            new DailyAvailability { DayOfWeek = "Friday",    StartTime = new TimeOnly(14, 0), EndTime = new TimeOnly(22, 0) },
        ],
        DaysOff = []
    };

    private static Driver CreateDriver(
        string firstName,
        string lastName,
        string phone,
        string email,
        string licenseNumber,
        int yearsUntilExpiry,
        Guid? depotId,
        OperatingHours availability,
        bool isActive = true)
    {
        var driver = Driver.Create(
            firstName, lastName, phone, email,
            licenseNumber,
            DateOnly.FromDateTime(DateTime.UtcNow.AddYears(yearsUntilExpiry)),
            photoUrl: null,
            zoneId: null,
            depotId: depotId);

        driver.UpdateAvailability(availability);

        if (!isActive)
            driver.Deactivate();

        return driver;
    }

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in RoleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new AppRole(roleName));
                if (result.Succeeded)
                    logger.LogInformation("Created role: {Role}", roleName);
                else
                    logger.LogError("Failed to create role {Role}: {Errors}", roleName,
                        string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    private async Task SeedAdminUserAsync()
    {
        var adminEmail = configuration["Seeding:AdminEmail"] ?? "admin@lastmile.local";
        var adminPassword = configuration["Seeding:AdminPassword"] ?? "Admin@123456";
        var adminFirstName = configuration["Seeding:AdminFirstName"] ?? "System";
        var adminLastName = configuration["Seeding:AdminLastName"] ?? "Administrator";

        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing != null)
            return;

        var admin = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            FirstName = adminFirstName,
            LastName = adminLastName,
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var createResult = await userManager.CreateAsync(admin, adminPassword);
        if (!createResult.Succeeded)
        {
            logger.LogError("Failed to create admin user: {Errors}",
                string.Join(", ", createResult.Errors.Select(e => e.Description)));
            return;
        }

        var roleResult = await userManager.AddToRoleAsync(admin, nameof(UserRole.Admin));
        if (roleResult.Succeeded)
            logger.LogInformation("Admin user seeded: {Email}", adminEmail);
        else
            logger.LogError("Failed to assign Admin role: {Errors}",
                string.Join(", ", roleResult.Errors.Select(e => e.Description)));
    }

    private async Task SeedOperationsManagerUserAsync()
    {
        var email = configuration["Seeding:OpsEmail"] ?? "ops@lastmile.local";
        var password = configuration["Seeding:OpsPassword"] ?? "Ops@123456";

        var existing = await userManager.FindByEmailAsync(email);
        if (existing != null)
            return;

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = "Operations",
            LastName = "Manager",
            Role = UserRole.OperationsManager,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            logger.LogError("Failed to create ops user: {Errors}",
                string.Join(", ", createResult.Errors.Select(e => e.Description)));
            return;
        }

        var roleResult = await userManager.AddToRoleAsync(user, nameof(UserRole.OperationsManager));
        if (roleResult.Succeeded)
            logger.LogInformation("Operations Manager user seeded: {Email}", email);
        else
            logger.LogError("Failed to assign OperationsManager role: {Errors}",
                string.Join(", ", roleResult.Errors.Select(e => e.Description)));
    }

    private async Task SeedWarehouseManagerUsersAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync(cancellationToken);

        if (depots.Count == 0)
            return;

        var warehouseManagers = new[]
        {
            new
            {
                Email = configuration["Seeding:WarehouseManagerEmail"] ?? "warehouse.manager@lastmile.local",
                Password = configuration["Seeding:WarehouseManagerPassword"] ?? "Warehouse@123456",
                FirstName = configuration["Seeding:WarehouseManagerFirstName"] ?? "Warehouse",
                LastName = configuration["Seeding:WarehouseManagerLastName"] ?? "Manager",
                AssignedDepotId = depots[0].Id,
                DepotName = depots[0].Name,
            },
            new
            {
                Email = configuration["Seeding:WarehouseManager2Email"] ?? "warehouse.manager2@lastmile.local",
                Password = configuration["Seeding:WarehouseManager2Password"] ?? "Warehouse2@123456",
                FirstName = configuration["Seeding:WarehouseManager2FirstName"] ?? "Warehouse",
                LastName = configuration["Seeding:WarehouseManager2LastName"] ?? "Manager Two",
                AssignedDepotId = depots.Count > 1 ? depots[1].Id : depots[0].Id,
                DepotName = depots.Count > 1 ? depots[1].Name : depots[0].Name,
            }
        };

        foreach (var warehouseManager in warehouseManagers)
        {
            var existing = await userManager.FindByEmailAsync(warehouseManager.Email);
            if (existing != null)
                continue;

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = warehouseManager.Email,
                Email = warehouseManager.Email,
                EmailConfirmed = true,
                FirstName = warehouseManager.FirstName,
                LastName = warehouseManager.LastName,
                Role = UserRole.WarehouseManager,
                AssignedDepotId = warehouseManager.AssignedDepotId,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var createResult = await userManager.CreateAsync(user, warehouseManager.Password);
            if (!createResult.Succeeded)
            {
                logger.LogError("Failed to create warehouse manager user {Email}: {Errors}",
                    warehouseManager.Email,
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                continue;
            }

            var roleResult = await userManager.AddToRoleAsync(user, nameof(UserRole.WarehouseManager));
            if (roleResult.Succeeded)
                logger.LogInformation("Warehouse Manager user seeded: {Email} for depot {DepotName}", warehouseManager.Email, warehouseManager.DepotName);
            else
                logger.LogError("Failed to assign WarehouseManager role to {Email}: {Errors}",
                    warehouseManager.Email,
                    string.Join(", ", roleResult.Errors.Select(e => e.Description)));
        }
    }

    private async Task SeedDispatcherUserAsync()
    {
        var email = configuration["Seeding:DispatcherEmail"] ?? "dispatcher@lastmile.local";
        var password = configuration["Seeding:DispatcherPassword"] ?? "Dispatcher@123456";

        var existing = await userManager.FindByEmailAsync(email);
        if (existing != null)
            return;

        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = "Dispatch",
            LastName = "Coordinator",
            Role = UserRole.Dispatcher,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            logger.LogError("Failed to create dispatcher user: {Errors}",
                string.Join(", ", createResult.Errors.Select(e => e.Description)));
            return;
        }

        var roleResult = await userManager.AddToRoleAsync(user, nameof(UserRole.Dispatcher));
        if (roleResult.Succeeded)
            logger.LogInformation("Dispatcher user seeded: {Email}", email);
        else
            logger.LogError("Failed to assign Dispatcher role: {Errors}",
                string.Join(", ", roleResult.Errors.Select(e => e.Description)));
    }

    private async Task SeedZonesAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Zones.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        // Two zones per depot city with simple rectangular polygons
        var zones = new List<Zone>();
        foreach (var depot in depots)
        {
            var (baseLon, baseLat) = depot.Name switch
            {
                "Central Hub" => (-86.80, 36.16),
                "North Distribution Center" => (-85.76, 38.24),
                "South Fleet Yard" => (-86.80, 33.45),
                _ => (-86.80, 36.16),
            };

            // Zone A — slightly offset polygon
            zones.Add(new Zone
            {
                Id = Guid.NewGuid(),
                Name = $"{depot.Name} — Zone A",
                IsActive = true,
                DepotId = depot.Id,
                Boundary = geometryFactory.CreatePolygon(new[]
                {
                    new Coordinate(baseLon, baseLat),
                    new Coordinate(baseLon + 0.02, baseLat),
                    new Coordinate(baseLon + 0.02, baseLat + 0.02),
                    new Coordinate(baseLon, baseLat + 0.02),
                    new Coordinate(baseLon, baseLat),
                }),
                CreatedAt = DateTimeOffset.UtcNow,
            });

            // Zone B — adjacent polygon
            zones.Add(new Zone
            {
                Id = Guid.NewGuid(),
                Name = $"{depot.Name} — Zone B",
                IsActive = true,
                DepotId = depot.Id,
                Boundary = geometryFactory.CreatePolygon(new[]
                {
                    new Coordinate(baseLon + 0.02, baseLat),
                    new Coordinate(baseLon + 0.04, baseLat),
                    new Coordinate(baseLon + 0.04, baseLat + 0.02),
                    new Coordinate(baseLon + 0.02, baseLat + 0.02),
                    new Coordinate(baseLon + 0.02, baseLat),
                }),
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }

        await dbContext.Zones.AddRangeAsync(zones, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} zone records", zones.Count);
    }

    private async Task SeedAislesAndBinsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Aisles.AnyAsync(cancellationToken) || await dbContext.Bins.AnyAsync(cancellationToken))
            return;

        var zones = await dbContext.Zones
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);

        if (zones.Count == 0)
            return;

        var aisles = new List<Aisle>();
        var bins = new List<Bin>();

        foreach (var zone in zones)
        {
            var zoneLabelSegment = zone.Id.ToString("N")[..6].ToUpperInvariant();

            foreach (var (aisleCode, sortOrder) in new[] { ("A", 1), ("B", 2) })
            {
                var aisle = new Aisle
                {
                    Id = Guid.NewGuid(),
                    ZoneId = zone.Id,
                    Name = $"Aisle {aisleCode}",
                    Code = aisleCode,
                    SortOrder = sortOrder,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow,
                };

                aisles.Add(aisle);

                for (var index = 1; index <= 6; index++)
                {
                    bins.Add(new Bin
                    {
                        Id = Guid.NewGuid(),
                        AisleId = aisle.Id,
                        Name = $"Bin {aisleCode}-{index:00}",
                        Code = $"{aisleCode}-{index:00}",
                        LabelCode = $"BIN-{zoneLabelSegment}-{aisleCode}{index:00}",
                        CapacityParcelCount = 60 + (index * 10),
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

    private async Task SeedParcelsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Parcels.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);
        var zones = await dbContext.Zones
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);
        var routes = await dbContext.DeliveryRoutes
            .AsNoTracking()
            .Where(route => route.ZoneId != Guid.Empty)
            .OrderBy(route => route.Name)
            .ToListAsync(cancellationToken);
        var zonesByDepotId = zones
            .GroupBy(zone => zone.DepotId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var routesByDepotId = routes
            .GroupBy(route => route.DepotId)
            .ToDictionary(group => group.Key, group => group.ToList());
        var binsByZone = await dbContext.Bins
            .AsNoTracking()
            .Include(b => b.Aisle)
            .Where(b =>
                b.IsActive &&
                b.Aisle.IsActive &&
                b.Aisle.Zone.IsActive &&
                b.Aisle.Zone.Depot.IsActive)
            .GroupBy(b => b.Aisle.ZoneId)
            .ToDictionaryAsync(g => g.Key, g => g.OrderBy(b => b.Code).ToList(), cancellationToken);
        if (depots.Count == 0) return;

        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(42); // fixed seed for reproducibility

        var cities = new[]
        {
            ("Nashville", "TN", "37201", -86.78, 36.17),
            ("Louisville", "KY", "40201", -85.74, 38.25),
            ("Birmingham", "AL", "35201", -86.80, 33.52),
            ("Memphis", "TN", "38101", -90.03, 35.15),
            ("Chattanooga", "TN", "37402", -85.31, 35.05),
            ("Clarksville", "TN", "37040", -87.36, 36.53),
            ("Bowling Green", "KY", "42101", -86.44, 37.00),
            ("Huntsville", "AL", "35801", -86.59, 34.73),
        };

        var serviceTypes = Enum.GetValues<ServiceType>();
        var parcelTypes = new[] { "Standard", "Express", "Economy", "Overnight", "Fragile", "Heavy", "Document" };

        var firstNames = new[]
        {
            "James", "Mary", "Robert", "Patricia", "John", "Jennifer",
            "Michael", "Linda", "David", "Barbara", "William", "Elizabeth",
            "Carlos", "Maria", "Antonio", "Rosa", "Darnell", "Lakisha",
            "Wei", "Mei", "Viktor", "Olga", "Kofi", "Amara"
        };

        var lastNames = new[]
        {
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
            "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez",
            "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
            "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
            "Harris", "Clark", "Lewis", "Robinson", "Walker", "Young"
        };

        var shipperCompanies = new[]
        {
            "Volunteer Freight LLC",
            "Bluegrass Logistics Co",
            "Iron City Trade Goods",
            "Music City Supply Co",
            "Derby City Distribution",
        };

        var shipperContacts = new[]
        {
            ("Mark", "Stevens"), ("Diane", "Harper"), ("Ray", "Chen"), ("Sandra", "Owens"), ("Tyrone", "Bell")
        };

        var shipperAddresses = shipperCompanies.Select((company, idx) =>
        {
            var cityInfo = cities[idx % cities.Length];
            return new Address
            {
                Id = Guid.NewGuid(),
                Street1 = $"{100 + (idx + 1) * 10} Commerce Drive",
                City = cityInfo.Item1,
                State = cityInfo.Item2,
                PostalCode = cityInfo.Item3,
                CountryCode = "US",
                IsResidential = false,
                CompanyName = company,
                ContactName = $"{shipperContacts[idx].Item1} {shipperContacts[idx].Item2}",
                GeoLocation = geometryFactory.CreatePoint(new Coordinate(cityInfo.Item4, cityInfo.Item5)),
                CreatedAt = DateTimeOffset.UtcNow,
            };
        }).ToList();

        await dbContext.Addresses.AddRangeAsync(shipperAddresses, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var parcels = new List<Parcel>();
        var eventDescriptions = new Dictionary<ParcelStatus, string[]>
        {
            [ParcelStatus.Registered]       = new[] { "Label created and registered" },
            [ParcelStatus.ReceivedAtDepot]  = new[] { "Label created and registered", "Package received at depot" },
            [ParcelStatus.Sorted]           = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone" },
            [ParcelStatus.Staged]           = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading" },
            [ParcelStatus.Loaded]           = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle" },
            [ParcelStatus.OutForDelivery]   = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery" },
            [ParcelStatus.Delivered]        = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Package delivered successfully" },
            [ParcelStatus.FailedAttempt]    = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Delivery attempted — no one home" },
            [ParcelStatus.ReturnedToDepot]  = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Package staged for loading", "Package loaded onto vehicle", "Out for delivery", "Package returned to depot" },
            [ParcelStatus.Cancelled]        = new[] { "Label created and registered", "Package cancelled" },
            [ParcelStatus.Exception]        = new[] { "Label created and registered", "Package received at depot", "Package sorted to zone", "Exception: address not found" },
        };

        var i = 1;
        foreach (var (depot, depotIndex) in depots.Select((value, index) => (value, index)))
        {
            zonesByDepotId.TryGetValue(depot.Id, out var depotZones);
            depotZones ??= new List<Zone>();
            var statusPlan = GetStatusPlanForDepot(depotIndex);

            var statusOccurrences = new Dictionary<ParcelStatus, int>();

            foreach (var status in statusPlan)
            {
                statusOccurrences.TryGetValue(status, out var statusOccurrenceIndex);
                statusOccurrenceIndex += 1;
                statusOccurrences[status] = statusOccurrenceIndex;

                var cityInfo = cities[random.Next(cities.Length)];
                var recipientAddress = new Address
                {
                    Id = Guid.NewGuid(),
                    Street1 = $"{random.Next(100, 9999)} {new[] { "Main", "Oak", "Maple", "Cedar", "Elm", "Pine", "Market", "Commerce" }[random.Next(8)]} {new[] { "St", "Ave", "Blvd", "Dr", "Ln" }[random.Next(5)]}",
                    City = cityInfo.Item1,
                    State = cityInfo.Item2,
                    PostalCode = cityInfo.Item3,
                    CountryCode = "US",
                    IsResidential = random.Next(2) == 0,
                    ContactName = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}",
                    Phone = $"615-{random.Next(100, 999)}-{random.Next(1000, 9999)}",
                    Email = $"recipient{i}@example.com",
                    GeoLocation = geometryFactory.CreatePoint(new Coordinate(cityInfo.Item4, cityInfo.Item5)),
                    CreatedAt = DateTimeOffset.UtcNow,
                };

                var shipper = shipperAddresses[random.Next(shipperAddresses.Count)];
                var zone = depotZones.Count > 0
                    ? depotZones[random.Next(depotZones.Count)]
                    : null;
                var assignedRouteId = SelectSeedRouteId(
                    status,
                    statusOccurrenceIndex,
                    depot.Id,
                    zone?.Id,
                    routesByDepotId);
                Bin? currentBin = null;
                if (zone is not null && (status == ParcelStatus.Sorted || status == ParcelStatus.Staged) && binsByZone.TryGetValue(zone.Id, out var zoneBins) && zoneBins.Count > 0)
                {
                    currentBin = zoneBins[random.Next(zoneBins.Count)];
                }
                var serviceType = serviceTypes[random.Next(serviceTypes.Length)];
                var parcelType = parcelTypes[random.Next(parcelTypes.Length)];
                var now = DateTimeOffset.UtcNow;
                var currentStatusAgeHours = GetSeededCurrentStatusAgeHours(status, statusOccurrenceIndex, depotIndex);
                var createdAt = now.AddHours(-(currentStatusAgeHours + random.Next(12, 168)));
                var currentStatusChangedAt = now.AddHours(-currentStatusAgeHours);
                var eventDescs = eventDescriptions[status];

                var trackingEvents = new List<TrackingEvent>();
                var eventTypesForStatus = new Dictionary<ParcelStatus, EventType[]>
                {
                    [ParcelStatus.Registered]       = new[] { EventType.LabelCreated },
                    [ParcelStatus.ReceivedAtDepot]  = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility },
                    [ParcelStatus.Sorted]           = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility },
                    [ParcelStatus.Staged]           = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility, EventType.DepartedFacility },
                    [ParcelStatus.Loaded]           = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.HeldAtFacility },
                    [ParcelStatus.OutForDelivery]   = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.OutForDelivery },
                    [ParcelStatus.Delivered]        = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.Delivered, EventType.Delivered },
                    [ParcelStatus.FailedAttempt]    = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.DeliveryAttempted, EventType.DeliveryAttempted },
                    [ParcelStatus.ReturnedToDepot]  = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.InTransit, EventType.DepartedFacility, EventType.OutForDelivery, EventType.Returned, EventType.HeldAtFacility },
                    [ParcelStatus.Cancelled]        = new[] { EventType.LabelCreated, EventType.Exception },
                    [ParcelStatus.Exception]        = new[] { EventType.LabelCreated, EventType.ArrivedAtFacility, EventType.HeldAtFacility, EventType.Exception },
                };

                var parcelEventTypes = eventTypesForStatus[status];
                var eventCount = Math.Min(eventDescs.Length, parcelEventTypes.Length);
                var timelineHours = Math.Max(0, (currentStatusChangedAt - createdAt).TotalHours);
                var eventStepHours = eventCount > 1 ? timelineHours / (eventCount - 1) : 0;
                for (var k = 0; k < eventCount; k++)
                {
                    var eventTimestamp = k == eventCount - 1
                        ? currentStatusChangedAt
                        : createdAt.AddHours(eventStepHours * k);

                    trackingEvents.Add(new TrackingEvent
                    {
                        Id = Guid.NewGuid(),
                        Timestamp = eventTimestamp,
                        EventType = parcelEventTypes[k],
                        Description = eventDescs[k],
                        LocationCity = cityInfo.Item1,
                        LocationState = cityInfo.Item2,
                        LocationCountryCode = "US",
                        CreatedAt = eventTimestamp,
                    });
                }

                var contentItems = Enumerable.Range(1, random.Next(1, 4)).Select(_ => new ParcelContentItem
                {
                    Id = Guid.NewGuid(),
                    HsCode = $"{random.Next(6000, 9999)}.{random.Next(10, 99)}",
                    Description = new[] { "Electronics", "Clothing", "Books", "Home goods", "Food items", "Toys", "Cosmetics" }[random.Next(7)],
                    Quantity = random.Next(1, 5),
                    UnitValue = Math.Round((decimal)(random.NextDouble() * 200 + 5), 2),
                    Currency = "USD",
                    Weight = Math.Round((decimal)(random.NextDouble() * 5 + 0.1), 2),
                    WeightUnit = WeightUnit.Kg,
                    OriginCountryCode = "US",
                    CreatedAt = createdAt,
                }).ToList();

                var parcel = new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"LM-2026-{i:D5}",
                    Description = $"{parcelType} shipment",
                    ServiceType = serviceType,
                    Status = status,
                    RecipientAddressId = recipientAddress.Id,
                    RecipientAddress = recipientAddress,
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
                    ActualDeliveryDate = status == ParcelStatus.Delivered ? currentStatusChangedAt : null,
                    DeliveryAttempts = status == ParcelStatus.FailedAttempt ? random.Next(1, 3) : 0,
                    ParcelType = parcelType,
                    ZoneId = zone?.Id,
                    CurrentBinId = currentBin?.Id,
                    RouteId = assignedRouteId,
                    CreatedAt = createdAt,
                    CurrentStatusChangedAt = currentStatusChangedAt,
                    LastModifiedAt = currentStatusChangedAt.AddMinutes(random.Next(15, 180)),
                };

                parcels.Add(parcel);
                i++;
            }
        }

        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} parcel records", parcels.Count);
    }

    private static Guid? SelectSeedRouteId(
        ParcelStatus status,
        int statusOccurrenceIndex,
        Guid depotId,
        Guid? zoneId,
        IReadOnlyDictionary<Guid, List<DeliveryRoute>> routesByDepotId)
    {
        if (status != ParcelStatus.Staged || statusOccurrenceIndex % 2 == 0)
            return null;

        if (!routesByDepotId.TryGetValue(depotId, out var depotRoutes) || depotRoutes.Count == 0)
            return null;

        var matchingRoutes = zoneId.HasValue
            ? depotRoutes.Where(route => route.ZoneId == zoneId).ToList()
            : depotRoutes;

        if (matchingRoutes.Count == 0)
            matchingRoutes = depotRoutes;

        return matchingRoutes[(statusOccurrenceIndex - 1) % matchingRoutes.Count].Id;
    }

    private static ParcelStatus[] GetStatusPlanForDepot(int depotIndex) => (depotIndex % 3) switch
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
        _ =>
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
    };

    private static double GetSeededCurrentStatusAgeHours(
        ParcelStatus status,
        int statusOccurrenceIndex,
        int depotIndex)
    {
        var agePattern = (depotIndex % 3, status) switch
        {
            (0, ParcelStatus.Registered) => new[] { 5d, 32d },
            (0, ParcelStatus.ReceivedAtDepot) => new[] { 6d, 28d, 76d },
            (0, ParcelStatus.Sorted) => new[] { 8d, 30d, 54d },
            (0, ParcelStatus.Staged) => new[] { 4d, 26d, 50d },
            (0, ParcelStatus.Loaded) => new[] { 5d, 30d },
            (0, ParcelStatus.OutForDelivery) => new[] { 3d, 18d },
            (0, ParcelStatus.Delivered) => new[] { 7d, 42d },
            (0, ParcelStatus.FailedAttempt) => new[] { 12d, 60d },
            (0, ParcelStatus.ReturnedToDepot) => new[] { 36d },
            (0, ParcelStatus.Cancelled) => new[] { 20d },
            (0, ParcelStatus.Exception) => new[] { 16d, 84d },
            (1, ParcelStatus.Registered) => new[] { 9d },
            (1, ParcelStatus.ReceivedAtDepot) => new[] { 10d, 34d, 58d, 82d },
            (1, ParcelStatus.Sorted) => new[] { 12d, 40d, 62d, 90d },
            (1, ParcelStatus.Staged) => new[] { 6d, 27d },
            (1, ParcelStatus.Loaded) => new[] { 9d, 36d, 70d },
            (1, ParcelStatus.OutForDelivery) => new[] { 5d },
            (1, ParcelStatus.Delivered) => new[] { 9d, 30d, 66d },
            (1, ParcelStatus.FailedAttempt) => new[] { 20d },
            (1, ParcelStatus.ReturnedToDepot) => new[] { 88d },
            (1, ParcelStatus.Cancelled) => new[] { 14d },
            (1, ParcelStatus.Exception) => new[] { 22d },
            (2, ParcelStatus.Registered) => new[] { 4d, 18d, 44d },
            (2, ParcelStatus.ReceivedAtDepot) => new[] { 8d, 24d },
            (2, ParcelStatus.Sorted) => new[] { 11d, 52d },
            (2, ParcelStatus.Staged) => new[] { 5d, 22d, 44d, 76d },
            (2, ParcelStatus.Loaded) => new[] { 14d },
            (2, ParcelStatus.OutForDelivery) => new[] { 7d, 26d },
            (2, ParcelStatus.Delivered) => new[] { 15d },
            (2, ParcelStatus.FailedAttempt) => new[] { 17d, 58d },
            (2, ParcelStatus.ReturnedToDepot) => new[] { 42d },
            (2, ParcelStatus.Cancelled) => new[] { 12d },
            (2, ParcelStatus.Exception) => new[] { 20d, 46d, 88d },
            _ => new[] { 24d },
        };

        return agePattern[Math.Min(statusOccurrenceIndex - 1, agePattern.Length - 1)];
    }

    private async Task SeedDepotOperatorUsersAsync(CancellationToken cancellationToken)
    {
        var depots = await dbContext.Depots
            .OrderBy(d => d.Name)
            .Select(d => new { d.Id, d.Name })
            .ToListAsync(cancellationToken);

        if (depots.Count == 0)
            return;

        var depotOperators = new[]
        {
            new
            {
                Email = "depot.operator@lastmile.local",
                Password = "DepotOp@123456",
                FirstName = "Depot",
                LastName = "Operator",
                AssignedDepotId = depots[0].Id,
                DepotName = depots[0].Name,
            },
            new
            {
                Email = "depot.operator2@lastmile.local",
                Password = "DepotOp2@123456",
                FirstName = "Depot",
                LastName = "Operator Two",
                AssignedDepotId = depots.Count > 1 ? depots[1].Id : depots[0].Id,
                DepotName = depots.Count > 1 ? depots[1].Name : depots[0].Name,
            },
            new
            {
                Email = "depot.operator3@lastmile.local",
                Password = "DepotOp3@123456",
                FirstName = "Depot",
                LastName = "Operator Three",
                AssignedDepotId = depots.Count > 2 ? depots[2].Id : depots[0].Id,
                DepotName = depots.Count > 2 ? depots[2].Name : depots[0].Name,
            }
        };

        foreach (var depotOperator in depotOperators)
        {
            var existing = await userManager.FindByEmailAsync(depotOperator.Email);
            if (existing != null)
                continue;

            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = depotOperator.Email,
                Email = depotOperator.Email,
                EmailConfirmed = true,
                FirstName = depotOperator.FirstName,
                LastName = depotOperator.LastName,
                Role = UserRole.DepotOperator,
                AssignedDepotId = depotOperator.AssignedDepotId,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            var createResult = await userManager.CreateAsync(user, depotOperator.Password);
            if (!createResult.Succeeded)
            {
                logger.LogError("Failed to create depot operator user {Email}: {Errors}",
                    depotOperator.Email,
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                continue;
            }

            var roleResult = await userManager.AddToRoleAsync(user, nameof(UserRole.DepotOperator));
            if (roleResult.Succeeded)
                logger.LogInformation("Depot Operator user seeded: {Email} for depot {DepotName}", depotOperator.Email, depotOperator.DepotName);
            else
                logger.LogError("Failed to assign DepotOperator role to {Email}: {Errors}",
                    depotOperator.Email,
                    string.Join(", ", roleResult.Errors.Select(e => e.Description)));
        }
    }

    private async Task SeedDeliveryRoutesAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.DeliveryRoutes.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

        var drivers = await dbContext.Drivers.ToListAsync(cancellationToken);
        var zones = await dbContext.Zones.ToListAsync(cancellationToken);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var routes = new List<DeliveryRoute>();

        foreach (var depot in depots)
        {
            var depotDrivers = drivers.Where(d => d.DepotId == depot.Id).Take(4).ToList();
            var depotZones = zones.Where(z => z.DepotId == depot.Id).ToList();

            if (depotDrivers.Count == 0 || depotZones.Count == 0) continue;

            var routeNames = new[] { "Morning Run", "Midday Run", "Afternoon Run", "Evening Run" };

            for (var r = 0; r < Math.Min(4, depotDrivers.Count); r++)
            {
                var zone = depotZones[r % depotZones.Count];
                var driver = depotDrivers[r];

                var route = new DeliveryRoute
                {
                    Id = Guid.NewGuid(),
                    Name = $"{depot.Name} — {routeNames[r]}",
                    DepotId = depot.Id,
                    DriverId = driver.Id,
                    ZoneId = zone.Id,
                    Date = today,
                    Status = RouteStatus.Draft,
                    CreatedAt = DateTimeOffset.UtcNow,
                };

                routes.Add(route);
            }
        }

        await dbContext.DeliveryRoutes.AddRangeAsync(routes, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {RouteCount} delivery routes", routes.Count);
    }

    private async Task SeedSortDemoParcelsAsync(CancellationToken cancellationToken)
    {
        const string trackingPrefix = "LM-SORT-";
        if (await dbContext.Parcels.AnyAsync(p => p.TrackingNumber.StartsWith(trackingPrefix), cancellationToken))
            return;

        var zones = await dbContext.Zones
            .Where(z => z.IsActive)
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);

        if (zones.Count == 0)
            return;

        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "100 Sort Demo Drive",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = false,
            CompanyName = "Sort Demo Shipper Co",
            ContactName = "Demo Shipper",
            GeoLocation = geometryFactory.CreatePoint(new Coordinate(-86.78, 36.17)),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await dbContext.Addresses.AddAsync(shipperAddress, cancellationToken);

        var recipientNames = new[]
        {
            "Alice Johnson", "Bob Smith", "Carol Williams", "David Brown",
            "Emma Davis", "Frank Miller", "Grace Wilson", "Henry Moore",
            "Iris Taylor", "Jack Anderson", "Karen Thomas", "Leo Jackson",
        };

        var cities = new[]
        {
            ("Nashville",   "TN", "37201", -86.78, 36.17),
            ("Louisville",  "KY", "40201", -85.74, 38.25),
            ("Birmingham",  "AL", "35201", -86.80, 33.52),
        };

        var recipients = new List<Address>();
        var parcels = new List<Parcel>();

        for (var i = 1; i <= 12; i++)
        {
            var zone = zones[(i - 1) % zones.Count];
            var cityInfo = cities[(i - 1) % cities.Length];
            var now = DateTimeOffset.UtcNow;
            var createdAt = now.AddHours(-(i * 3));

            var recipient = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = $"{100 + i * 7} Demo Street",
                City = cityInfo.Item1,
                State = cityInfo.Item2,
                PostalCode = cityInfo.Item3,
                CountryCode = "US",
                IsResidential = true,
                ContactName = recipientNames[(i - 1) % recipientNames.Length],
                Email = $"sort.demo{i}@example.com",
                GeoLocation = geometryFactory.CreatePoint(new Coordinate(cityInfo.Item4, cityInfo.Item5)),
                CreatedAt = createdAt,
            };
            recipients.Add(recipient);

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"{trackingPrefix}{i:D5}",
                Description = "Sort demo shipment",
                ServiceType = ServiceType.Standard,
                Status = ParcelStatus.ReceivedAtDepot,
                RecipientAddressId = recipient.Id,
                RecipientAddress = recipient,
                ShipperAddressId = shipperAddress.Id,
                ShipperAddress = shipperAddress,
                Weight = Math.Round(1.5m + i * 0.3m, 1),
                WeightUnit = WeightUnit.Kg,
                Length = 20,
                Width = 15,
                Height = 10,
                DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = 50m + i * 10m,
                Currency = "USD",
                EstimatedDeliveryDate = now.AddDays(3),
                ParcelType = "Standard",
                ZoneId = zone.Id,
                CreatedAt = createdAt,
                CurrentStatusChangedAt = createdAt.AddHours(1),
                LastModifiedAt = createdAt.AddHours(1),
            };

            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(),
                ParcelId = parcel.Id,
                Timestamp = createdAt,
                EventType = EventType.LabelCreated,
                Description = "Label created and registered",
                LocationCity = "Nashville",
                LocationState = "TN",
                LocationCountryCode = "US",
                CreatedAt = createdAt,
            });

            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(),
                ParcelId = parcel.Id,
                Timestamp = createdAt.AddHours(1),
                EventType = EventType.ArrivedAtFacility,
                Description = "Package received at depot",
                LocationCity = "Nashville",
                LocationState = "TN",
                LocationCountryCode = "US",
                CreatedAt = createdAt.AddHours(1),
            });

            parcels.Add(parcel);
        }

        await dbContext.Addresses.AddRangeAsync(recipients, cancellationToken);
        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {Count} sort demo parcels (ReceivedAtDepot + zone)", parcels.Count);
    }

    private async Task SeedInboundManifestsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.InboundManifests.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);
        var zones = await dbContext.Zones
            .OrderBy(z => z.Name)
            .ToListAsync(cancellationToken);
        var zonesByDepotId = zones
            .GroupBy(z => z.DepotId)
            .ToDictionary(g => g.Key, g => g.ToList());

        if (depots.Count == 0) return;

        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        var random = new Random(99);

        var cities = new[]
        {
            ("Nashville", "TN", "37201", -86.78, 36.17),
            ("Louisville", "KY", "40201", -85.74, 38.25),
            ("Birmingham", "AL", "35201", -86.80, 33.52),
            ("Memphis", "TN", "38101", -90.03, 35.15),
            ("Chattanooga", "TN", "37402", -85.31, 35.05),
            ("Huntsville", "AL", "35801", -86.59, 34.73),
        };

        var firstNames = new[] { "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery", "Skyler", "Dakota", "Reese", "Finley" };
        var lastNames = new[] { "Nguyen", "Patel", "Kim", "Chen", "Singh", "Ross", "Cook", "Morgan", "Bell", "Ward", "Torres", "Peterson" };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "500 Manifest Way",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = false,
            CompanyName = "Manifest Demo Shipper",
            ContactName = "Demo Shipper",
            GeoLocation = geometryFactory.CreatePoint(new Coordinate(-86.78, 36.17)),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await dbContext.Addresses.AddAsync(shipperAddress, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var allParcels = new List<Parcel>();
        var allManifests = new List<InboundManifest>();
        var manifestSeq = 1;
        var now = DateTimeOffset.UtcNow;
        var totalTarget = 52; // ~17 per depot

        foreach (var depot in depots)
        {
            zonesByDepotId.TryGetValue(depot.Id, out var depotZones);
            depotZones ??= new List<Zone>();

            var parcelsForDepot = totalTarget / depots.Count;
            var parcelsCreated = 0;
            var manifestParcels = new List<Parcel>();

            while (parcelsCreated < parcelsForDepot)
            {
                var cityInfo = cities[random.Next(cities.Length)];
                var zone = depotZones.Count > 0 ? depotZones[random.Next(depotZones.Count)] : null;

                var recipientAddress = new Address
                {
                    Id = Guid.NewGuid(),
                    Street1 = $"{random.Next(100, 9999)} {new[] { "Main", "Oak", "Maple", "Cedar", "Elm" }[random.Next(5)]} St",
                    City = cityInfo.Item1,
                    State = cityInfo.Item2,
                    PostalCode = cityInfo.Item3,
                    CountryCode = "US",
                    IsResidential = true,
                    ContactName = $"{firstNames[random.Next(firstNames.Length)]} {lastNames[random.Next(lastNames.Length)]}",
                    Phone = $"615-{random.Next(100, 999)}-{random.Next(1000, 9999)}",
                    GeoLocation = geometryFactory.CreatePoint(new Coordinate(cityInfo.Item4, cityInfo.Item5)),
                    CreatedAt = now,
                };

                await dbContext.Addresses.AddAsync(recipientAddress, cancellationToken);

                var parcel = new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = $"LM-MFT-{manifestSeq:D5}-{parcelsCreated + 1:D2}",
                    BarcodeData = $"LM-MFT-{manifestSeq:D5}-{parcelsCreated + 1:D2}",
                    Description = "Inbound manifest parcel",
                    ServiceType = ServiceType.Standard,
                    Status = ParcelStatus.Registered,
                    RecipientAddressId = recipientAddress.Id,
                    RecipientAddress = recipientAddress,
                    ShipperAddressId = shipperAddress.Id,
                    ShipperAddress = shipperAddress,
                    Weight = Math.Round((decimal)(random.NextDouble() * 15 + 0.5), 2),
                    WeightUnit = WeightUnit.Kg,
                    Length = random.Next(15, 60),
                    Width = random.Next(10, 40),
                    Height = random.Next(5, 30),
                    DimensionUnit = DimensionUnit.Cm,
                    DeclaredValue = Math.Round((decimal)(random.NextDouble() * 300 + 10), 2),
                    Currency = "USD",
                    ParcelType = "Standard",
                    ZoneId = zone?.Id,
                    DeliveryAttempts = 0,
                    CreatedAt = now,
                    CurrentStatusChangedAt = now,
                };

                parcel.TrackingEvents.Add(new TrackingEvent
                {
                    Id = Guid.NewGuid(),
                    ParcelId = parcel.Id,
                    Timestamp = now,
                    EventType = EventType.LabelCreated,
                    Description = "Label created and registered",
                    LocationCity = cityInfo.Item1,
                    LocationState = cityInfo.Item2,
                    LocationCountryCode = "US",
                    CreatedAt = now,
                });

                allParcels.Add(parcel);
                manifestParcels.Add(parcel);
                parcelsCreated++;

                // When we hit the manifest cap (8-10), create the manifest
                var maxParcels = random.Next(8, 11);
                if (manifestParcels.Count >= maxParcels || parcelsCreated >= parcelsForDepot)
                {
                    var manifestNumber = $"MFT-{now:yyyyMMdd}-{manifestSeq:D3}";
                    var manifest = new InboundManifest
                    {
                        Id = Guid.NewGuid(),
                        ManifestNumber = manifestNumber,
                        DepotId = depot.Id,
                        Status = manifestParcels.Count >= maxParcels
                            ? InboundManifestStatus.Sealed
                            : InboundManifestStatus.Open,
                        MaxParcels = maxParcels,
                        Parcels = manifestParcels.ToList(),
                        CreatedAt = now,
                    };

                    allManifests.Add(manifest);
                    manifestSeq++;
                    manifestParcels.Clear();
                }
            }
        }

        // Add a few walk-in parcels (no manifest) for testing
        for (var w = 0; w < 6; w++)
        {
            var depot = depots[w % depots.Count];
            zonesByDepotId.TryGetValue(depot.Id, out var depotZones);
            depotZones ??= new List<Zone>();
            var zone = depotZones.Count > 0 ? depotZones[w % depotZones.Count] : null;
            var cityInfo = cities[w % cities.Length];

            var recipientAddress = new Address
            {
                Id = Guid.NewGuid(),
                Street1 = $"{random.Next(100, 9999)} Walk-in St",
                City = cityInfo.Item1,
                State = cityInfo.Item2,
                PostalCode = cityInfo.Item3,
                CountryCode = "US",
                IsResidential = true,
                ContactName = $"Walk-in Customer {w + 1}",
                GeoLocation = geometryFactory.CreatePoint(new Coordinate(cityInfo.Item4, cityInfo.Item5)),
                CreatedAt = now,
            };

            await dbContext.Addresses.AddAsync(recipientAddress, cancellationToken);

            var parcel = new Parcel
            {
                Id = Guid.NewGuid(),
                TrackingNumber = $"LM-WALK-{w + 1:D5}",
                BarcodeData = $"LM-WALK-{w + 1:D5}",
                Description = "Walk-in parcel (no manifest)",
                ServiceType = ServiceType.Express,
                Status = ParcelStatus.Registered,
                RecipientAddressId = recipientAddress.Id,
                RecipientAddress = recipientAddress,
                ShipperAddressId = shipperAddress.Id,
                ShipperAddress = shipperAddress,
                Weight = Math.Round((decimal)(random.NextDouble() * 5 + 0.5), 2),
                WeightUnit = WeightUnit.Kg,
                Length = 20,
                Width = 15,
                Height = 10,
                DimensionUnit = DimensionUnit.Cm,
                DeclaredValue = Math.Round((decimal)(random.NextDouble() * 100 + 10), 2),
                Currency = "USD",
                ParcelType = "Express",
                ZoneId = zone?.Id,
                DeliveryAttempts = 0,
                CreatedAt = now,
                CurrentStatusChangedAt = now,
            };

            parcel.TrackingEvents.Add(new TrackingEvent
            {
                Id = Guid.NewGuid(),
                ParcelId = parcel.Id,
                Timestamp = now,
                EventType = EventType.LabelCreated,
                Description = "Label created and registered",
                LocationCity = cityInfo.Item1,
                LocationState = cityInfo.Item2,
                LocationCountryCode = "US",
                CreatedAt = now,
            });

            allParcels.Add(parcel);
        }

        await dbContext.Parcels.AddRangeAsync(allParcels, cancellationToken);
        await dbContext.InboundManifests.AddRangeAsync(allManifests, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded {ParcelCount} inbound parcels in {ManifestCount} manifests + {WalkInCount} walk-in parcels",
            totalTarget, allManifests.Count, 6);
    }
}
