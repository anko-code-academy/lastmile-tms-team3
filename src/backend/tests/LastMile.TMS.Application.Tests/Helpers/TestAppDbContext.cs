using System.Runtime.CompilerServices;
using System.Text.Json;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Tests.Helpers;

/// <summary>
/// A minimal DbContext for testing using EF Core InMemory.
/// Does NOT inherit from IdentityDbContext to avoid OpenIddict dependencies.
/// </summary>
public class TestAppDbContext : DbContext, IAppDbContext, IAppDbContextFactory
{
    private static readonly Dictionary<string, string> _dbNames = new();
    private readonly string? _instanceDbName;

    public TestAppDbContext(DbContextOptions<TestAppDbContext> options, string? instanceDbName = null)
        : base(options)
    {
        _instanceDbName = instanceDbName;
    }

    public DbSet<Depot> Depots => Set<Depot>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Parcel> Parcels => Set<Parcel>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<TrackingEvent> TrackingEvents => Set<TrackingEvent>();
    public DbSet<ParcelContentItem> ParcelContentItems => Set<ParcelContentItem>();
    public DbSet<ParcelWatcher> ParcelWatchers => Set<ParcelWatcher>();
    public DbSet<DeliveryConfirmation> DeliveryConfirmations => Set<DeliveryConfirmation>();

    public new Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return base.SaveChangesAsync(cancellationToken);
    }

    public Task<List<Zone>> GetZonesAsync(CancellationToken cancellationToken = default)
    {
        return Zones.Where(z => z.IsActive && z.Boundary != null).ToListAsync(cancellationToken);
    }

    public IAppDbContext CreateDbContext()
    {
        var dbName = _instanceDbName ?? throw new InvalidOperationException("TestAppDbContext was not created via Create()");
        var options = new DbContextOptionsBuilder<TestAppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new TestAppDbContext(options, dbName);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Depot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Address)
                .WithOne()
                .HasForeignKey<Depot>(e => e.AddressId);
            entity.OwnsOne(d => d.OperatingHours, oh =>
            {
                oh.Property(p => p.Schedule)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => DeserializeSchedule(v))
                    .HasColumnName("OperatingHoursSchedule");
                oh.Property(p => p.DaysOff)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => DeserializeDaysOff(v))
                    .HasColumnName("OperatingHoursDaysOff");
            });
            entity.Ignore(e => e.Zones);
            entity.Ignore(e => e.Vehicles);
        });

        modelBuilder.Entity<Zone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Depot)
                .WithMany(d => d.Zones)
                .HasForeignKey(e => e.DepotId);
            entity.Ignore(e => e.Boundary);
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Ignore(e => e.GeoLocation);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Depot)
                .WithMany()
                .HasForeignKey(e => e.DepotId);
        });

        modelBuilder.Entity<Driver>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Depot)
                .WithMany()
                .HasForeignKey(e => e.DepotId);
            entity.HasOne(e => e.Zone)
                .WithMany()
                .HasForeignKey(e => e.ZoneId);
            entity.OwnsOne(d => d.Availability, ah =>
            {
                ah.Property(p => p.Schedule)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => DeserializeSchedule(v))
                    .HasColumnName("AvailabilitySchedule");
                ah.Property(p => p.DaysOff)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => DeserializeDaysOff(v))
                    .HasColumnName("AvailabilityDaysOff");
            });
        });

        modelBuilder.Entity<Parcel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(p => p.ShipperAddress).WithMany().HasForeignKey(p => p.ShipperAddressId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(p => p.RecipientAddress).WithMany().HasForeignKey(p => p.RecipientAddressId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(p => p.Zone).WithMany().HasForeignKey(p => p.ZoneId).OnDelete(DeleteBehavior.Restrict);
            entity.HasMany(p => p.Watchers).WithMany(w => w.Parcels);
        });

        modelBuilder.Entity<TrackingEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parcel).WithMany(p => p.TrackingEvents).HasForeignKey(e => e.ParcelId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ParcelContentItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parcel).WithMany(p => p.ContentItems).HasForeignKey(e => e.ParcelId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ParcelWatcher>(entity =>
        {
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<DeliveryConfirmation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Parcel).WithOne(p => p.DeliveryConfirmation).HasForeignKey<DeliveryConfirmation>(e => e.ParcelId).OnDelete(DeleteBehavior.Cascade);
            entity.Ignore(e => e.DeliveryGeoLocation);
        });
    }

    private static List<DailyAvailability> DeserializeSchedule(string json)
    {
        return string.IsNullOrEmpty(json)
            ? new List<DailyAvailability>()
            : JsonSerializer.Deserialize<List<DailyAvailability>>(json) ?? new List<DailyAvailability>();
    }

    private static List<DayOff> DeserializeDaysOff(string json)
    {
        return string.IsNullOrEmpty(json)
            ? new List<DayOff>()
            : JsonSerializer.Deserialize<List<DayOff>>(json) ?? new List<DayOff>();
    }

    public static TestAppDbContext Create<TClass>() where TClass : class
    {
        var dbName = $"{typeof(TClass).Name}_{Guid.NewGuid()}";

        lock (_dbNames)
        {
            _dbNames[typeof(TClass).Name] = dbName;
        }

        var options = new DbContextOptionsBuilder<TestAppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TestAppDbContext(options, dbName);
    }

    public static TestAppDbContext Create()
    {
        return Create<object>();
    }
}

public class FakeCurrentUserService : ICurrentUserService
{
    public string? UserId => "test-user-id";
    public string? UserName => "testuser";
}
