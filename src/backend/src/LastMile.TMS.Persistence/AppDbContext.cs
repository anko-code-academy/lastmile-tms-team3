using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, AppRole, Guid>(options), IAppDbContext
{
    public DbSet<Depot> Depots => Set<Depot>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Parcel> Parcels => Set<Parcel>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<DeliveryConfirmation> DeliveryConfirmations => Set<DeliveryConfirmation>();
    public DbSet<ParcelContentItem> ParcelContentItems => Set<ParcelContentItem>();
    public DbSet<TrackingEvent> TrackingEvents => Set<TrackingEvent>();
    public DbSet<ParcelWatcher> ParcelWatchers => Set<ParcelWatcher>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        modelBuilder.UseOpenIddict<Guid>();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampAuditableEntities();
        return base.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<Zone>> GetZonesAsync(CancellationToken cancellationToken = default)
    {
        return await Zones.Where(z => z.IsActive && z.Boundary != null).ToListAsync(cancellationToken);
    }

    private void StampAuditableEntities()
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt <= DateTimeOffset.MinValue)
                {
                    entry.Entity.CreatedAt = now;
                }

                entry.Entity.LastModifiedAt = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedAt = now;
            }
        }
    }
}
