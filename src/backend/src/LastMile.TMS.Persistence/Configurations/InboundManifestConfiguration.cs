using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class InboundManifestConfiguration : IEntityTypeConfiguration<InboundManifest>
{
    public void Configure(EntityTypeBuilder<InboundManifest> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ManifestNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.MaxParcels)
            .IsRequired();

        builder.HasIndex(e => e.ManifestNumber).IsUnique();
        builder.HasIndex(e => e.Status);
        builder.HasIndex(e => e.DepotId);
        builder.HasIndex(e => new { e.DepotId, e.Status });

        builder.HasOne(e => e.Depot)
            .WithMany()
            .HasForeignKey(e => e.DepotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(e => e.Parcels)
            .WithMany()
            .UsingEntity(join => join.ToTable("InboundManifestParcels"));
    }
}
