using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Persistence.Configurations;

public class ZoneConfiguration : IEntityTypeConfiguration<Zone>
{
    public void Configure(EntityTypeBuilder<Zone> builder)
    {
        builder.ToTable("Zones");

        builder.HasKey(z => z.Id);

        builder.Property(z => z.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(z => z.IsActive)
            .HasDefaultValue(true);

        builder.Property(z => z.Boundary)
            .HasColumnType("geometry (polygon)");

        builder.HasIndex(z => z.Boundary)
            .HasMethod("GIST");

        builder.HasOne(z => z.Depot)
            .WithMany(d => d.Zones)
            .HasForeignKey(z => z.DepotId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}