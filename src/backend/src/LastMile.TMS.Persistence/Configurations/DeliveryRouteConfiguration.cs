using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class DeliveryRouteConfiguration : IEntityTypeConfiguration<DeliveryRoute>
{
    public void Configure(EntityTypeBuilder<DeliveryRoute> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Date)
            .IsRequired();

        // Indexes for sorting and common queries
        builder.HasIndex(e => e.Date);
        builder.HasIndex(e => e.Name);
        builder.HasIndex(e => e.Status);

        builder.HasOne(e => e.Depot)
            .WithMany()
            .HasForeignKey(e => e.DepotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Driver)
            .WithMany()
            .HasForeignKey(e => e.DriverId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Zone)
            .WithMany()
            .HasForeignKey(e => e.ZoneId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
