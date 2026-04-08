using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class BinConfiguration : IEntityTypeConfiguration<Bin>
{
    public void Configure(EntityTypeBuilder<Bin> builder)
    {
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(b => b.LabelCode)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.Notes)
            .HasMaxLength(500);

        builder.Property(b => b.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(b => new { b.AisleId, b.IsActive });

        builder.HasIndex(b => new { b.AisleId, b.Code })
            .IsUnique();

        builder.HasIndex(b => b.LabelCode)
            .IsUnique();

        builder.HasOne(b => b.Aisle)
            .WithMany(a => a.Bins)
            .HasForeignKey(b => b.AisleId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        builder.HasMany(b => b.Parcels)
            .WithOne(p => p.CurrentBin)
            .HasForeignKey(p => p.CurrentBinId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}