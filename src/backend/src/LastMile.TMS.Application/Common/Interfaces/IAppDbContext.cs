using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Common.Interfaces;

public interface IAppDbContext : IDisposable
{
    DbSet<Depot> Depots { get; }
    DbSet<Zone> Zones { get; }
    DbSet<Aisle> Aisles { get; }
    DbSet<Bin> Bins { get; }
    DbSet<Address> Addresses { get; }
    DbSet<Parcel> Parcels { get; }
    DbSet<Driver> Drivers { get; }
    DbSet<Vehicle> Vehicles { get; }
    DbSet<DeliveryRoute> DeliveryRoutes { get; }
    DbSet<ParcelImportHistory> ParcelImportHistories { get; }
    DbSet<RouteParcel> RouteParcels { get; }
    DbSet<InboundManifest> InboundManifests { get; }
    DbSet<InboundReceivingSession> InboundReceivingSessions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<List<Zone>> GetZonesAsync(CancellationToken cancellationToken = default);
}
