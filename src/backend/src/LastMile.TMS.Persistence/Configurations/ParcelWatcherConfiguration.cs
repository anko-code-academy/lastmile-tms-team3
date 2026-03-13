using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class ParcelWatcherConfiguration : IEntityTypeConfiguration<ParcelWatcher>
{
    public void Configure(EntityTypeBuilder<ParcelWatcher> builder)
    {
        builder.HasKey(pw => pw.Id);

        builder.Property(pw => pw.Email)
            .IsRequired()
            .HasMaxLength(254);

        builder.HasIndex(pw => pw.Email);

        builder.Property(pw => pw.Name)
            .HasMaxLength(150);

        // Many-to-many relationship with Parcel
        builder.HasMany(pw => pw.Parcels)
            .WithMany(p => p.Watchers)
            .UsingEntity<Dictionary<string, object>>(
                "ParcelWatcherParcel",
                j => j.HasOne<Parcel>().WithMany().HasForeignKey("ParcelId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasOne<ParcelWatcher>().WithMany().HasForeignKey("ParcelWatcherId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasKey("ParcelWatcherId", "ParcelId")
            );
    }
}