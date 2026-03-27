using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Common.Interfaces;

public interface IAppDbContext : IDisposable
{
    DbSet<Depot> Depots { get; }
    DbSet<Zone> Zones { get; }
    DbSet<Address> Addresses { get; }
    DbSet<Parcel> Parcels { get; }
    DbSet<Driver> Drivers { get; }
    DbSet<Vehicle> Vehicles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<List<Zone>> GetZonesAsync(CancellationToken cancellationToken = default);
}
