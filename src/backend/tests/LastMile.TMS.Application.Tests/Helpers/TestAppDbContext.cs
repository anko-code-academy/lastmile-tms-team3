using System.Text.Json;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Tests.Helpers;

/// <summary>
/// A minimal DbContext for testing using EF Core InMemory.
/// Does NOT inherit from IdentityDbContext to avoid OpenIddict dependencies.
/// </summary>
public class TestAppDbContext : DbContext, IAppDbContext
{
    public TestAppDbContext(DbContextOptions<TestAppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Depot> Depots => Set<Depot>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Parcel> Parcels => Set<Parcel>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    public new Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return base.SaveChangesAsync(cancellationToken);
    }

    public Task<List<Zone>> GetZonesAsync(CancellationToken cancellationToken = default)
    {
        return Zones.Where(z => z.IsActive && z.Boundary != null).ToListAsync(cancellationToken);
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

    public static TestAppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<TestAppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new TestAppDbContext(options);
    }
}

public class FakeCurrentUserService : ICurrentUserService
{
    public string? UserId => "test-user-id";
    public string? UserName => "testuser";
}
