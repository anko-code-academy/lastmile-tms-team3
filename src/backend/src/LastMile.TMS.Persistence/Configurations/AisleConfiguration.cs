using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class AisleConfiguration : IEntityTypeConfiguration<Aisle>
{
    public void Configure(EntityTypeBuilder<Aisle> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Code)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(a => a.Notes)
            .HasMaxLength(500);

        builder.Property(a => a.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(a => new { a.ZoneId, a.IsActive });

        builder.HasIndex(a => new { a.ZoneId, a.Code })
            .IsUnique();

        builder.HasOne(a => a.Zone)
            .WithMany(z => z.Aisles)
            .HasForeignKey(a => a.ZoneId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();
    }
}