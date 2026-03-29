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
        nameof(UserRole.Dispatcher),
        nameof(UserRole.WarehouseOperator),
        nameof(UserRole.Driver)
    ];

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedRolesAsync();
        await SeedAdminUserAsync();
        await SeedOperationsManagerUserAsync();
        await SeedDepotsAsync(cancellationToken);
        await SeedZonesAsync(cancellationToken);
        await SeedParcelsAsync(cancellationToken);
    }

    private async Task SeedDepotsAsync(CancellationToken cancellationToken)
    {
        var existingDepotNames = await dbContext.Depots
            .Select(d => d.Name)
            .ToHashSetAsync(cancellationToken);

        var depotsToSeed = CreateSeedDepots()
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

    private static List<Depot> CreateSeedDepots()
    {
        return
        [
            CreateDepot(
                name: "Central Hub",
                street1: "101 Logistics Way",
                city: "Nashville",
                state: "TN",
                postalCode: "37211"),
            CreateDepot(
                name: "North Distribution Center",
                street1: "2200 Commerce Drive",
                city: "Louisville",
                state: "KY",
                postalCode: "40216"),
            CreateDepot(
                name: "South Fleet Yard",
                street1: "850 Industrial Park Rd",
                city: "Birmingham",
                state: "AL",
                postalCode: "35210")
        ];
    }

    private static Depot CreateDepot(
        string name,
        string street1,
        string city,
        string state,
        string postalCode)
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

    private async Task SeedParcelsAsync(CancellationToken cancellationToken)
    {
        if (await dbContext.Parcels.AnyAsync(cancellationToken))
            return;

        var depots = await dbContext.Depots.ToListAsync(cancellationToken);
        var zones = await dbContext.Zones.ToListAsync(cancellationToken);
        if (depots.Count == 0) return;

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

        var statuses = new[]
        {
            (ParcelStatus.Registered, 15),
            (ParcelStatus.ReceivedAtDepot, 8),
            (ParcelStatus.Sorted, 5),
            (ParcelStatus.Staged, 4),
            (ParcelStatus.Loaded, 3),
            (ParcelStatus.OutForDelivery, 6),
            (ParcelStatus.Delivered, 5),
            (ParcelStatus.FailedAttempt, 2),
            (ParcelStatus.Exception, 2),
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

        var shipperAddresses = shipperCompanies.Select((company, idx) => new Address
        {
            Id = Guid.NewGuid(),
            Street1 = $"{100 + (idx + 1) * 10} Commerce Drive",
            City = cities[idx % cities.Length].Item1,
            State = cities[idx % cities.Length].Item2,
            PostalCode = cities[idx % cities.Length].Item3,
            CountryCode = "US",
            IsResidential = false,
            CompanyName = company,
            ContactName = $"{shipperContacts[idx].Item1} {shipperContacts[idx].Item2}",
            CreatedAt = DateTimeOffset.UtcNow,
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
        foreach (var (status, count) in statuses)
        {
            for (var j = 0; j < count; j++)
            {
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
                    CreatedAt = DateTimeOffset.UtcNow,
                };

                var shipper = shipperAddresses[random.Next(shipperAddresses.Count)];
                var zone = zones.Count > 0 && random.Next(3) > 0 ? zones[random.Next(zones.Count)] : null;
                var serviceType = serviceTypes[random.Next(serviceTypes.Length)];
                var parcelType = parcelTypes[random.Next(parcelTypes.Length)];
                var createdAt = DateTimeOffset.UtcNow.AddHours(-random.Next(1, 720));
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
                for (var k = 0; k < eventDescs.Length && k < parcelEventTypes.Length; k++)
                {
                    trackingEvents.Add(new TrackingEvent
                    {
                        Id = Guid.NewGuid(),
                        Timestamp = createdAt.AddHours(k * 4),
                        EventType = parcelEventTypes[k],
                        Description = eventDescs[k],
                        LocationCity = cityInfo.Item1,
                        LocationState = cityInfo.Item2,
                        LocationCountryCode = "US",
                        CreatedAt = createdAt.AddHours(k * 4),
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
                    ActualDeliveryDate = status == ParcelStatus.Delivered ? createdAt.AddDays(random.Next(1, 5)) : null,
                    DeliveryAttempts = status == ParcelStatus.FailedAttempt ? random.Next(1, 3) : 0,
                    ParcelType = parcelType,
                    ZoneId = zone?.Id,
                    CreatedAt = createdAt,
                    LastModifiedAt = createdAt.AddHours(random.Next(1, 48)),
                };

                parcels.Add(parcel);
                i++;
            }
        }

        await dbContext.Parcels.AddRangeAsync(parcels, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} parcel records", parcels.Count);
    }
}
