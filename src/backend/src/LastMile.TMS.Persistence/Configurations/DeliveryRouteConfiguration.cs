using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class DeliveryRouteConfiguration : IEntityTypeConfiguration<DeliveryRoute>
{
    public void Configure(EntityTypeBuilder<DeliveryRoute> builder)
    {
        builder.ToTable("DeliveryRoutes");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.Date)
            .IsRequired();

        builder.Property(r => r.ZoneId)
            .IsRequired();

        builder.Property(r => r.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(r => r.EstimatedDistance)
            .HasPrecision(10, 2);

        builder.Property(r => r.EstimatedStops)
            .IsRequired();

        // Relationships
        builder.HasOne(r => r.Depot)
            .WithMany()
            .HasForeignKey(r => r.DepotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Zone)
            .WithMany()
            .HasForeignKey(r => r.ZoneId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Driver)
            .WithMany()
            .HasForeignKey(r => r.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Vehicle)
            .WithMany()
            .HasForeignKey(r => r.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.RouteParcels)
            .WithOne(rp => rp.DeliveryRoute)
            .HasForeignKey(rp => rp.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(r => r.Date);
        builder.HasIndex(r => r.Name);
        builder.HasIndex(r => r.ZoneId);
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.DriverId);
        builder.HasIndex(r => r.VehicleId);
        builder.HasIndex(r => new { r.Date, r.ZoneId });
    }
}
