using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class RouteParcelConfiguration : IEntityTypeConfiguration<RouteParcel>
{
    public void Configure(EntityTypeBuilder<RouteParcel> builder)
    {
        builder.ToTable("RouteParcels");

        builder.HasKey(rp => new { rp.RouteId, rp.ParcelId });

        builder.Property(rp => rp.StopOrder)
            .IsRequired();

        builder.Property(rp => rp.AddedAt)
            .IsRequired();

        // Relationships
        builder.HasOne(rp => rp.Parcel)
            .WithMany(p => p.RouteAssignments)
            .HasForeignKey(rp => rp.ParcelId)
            .OnDelete(DeleteBehavior.Cascade);

        // A parcel can only be on one route at a time
        builder.HasIndex(rp => rp.ParcelId)
            .IsUnique();
    }
}
