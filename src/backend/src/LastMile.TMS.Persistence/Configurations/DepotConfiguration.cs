using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class DepotConfiguration : IEntityTypeConfiguration<Depot>
{
    public void Configure(EntityTypeBuilder<Depot> builder)
    {
        builder.ToTable("Depots");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(d => d.IsActive)
            .HasDefaultValue(true);

        builder.HasOne(d => d.Address)
            .WithMany()
            .HasForeignKey(d => d.AddressId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(d => d.AddressId)
            .HasColumnName("AddressId");

        builder.OwnsOne(d => d.OperatingHours, oh =>
        {
            oh.Property(p => p.OpenTime).HasColumnName("OpenTime");
            oh.Property(p => p.CloseTime).HasColumnName("CloseTime");
            oh.Property(p => p.DaysOfWeek)
                .HasConversion(
                    v => string.Join(',', v.Select(d => (int)d)),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => (DayOfWeek)int.Parse(s))
                        .ToArray())
                .HasColumnName("DaysOfWeek");
        });

        builder.HasMany(d => d.Zones)
            .WithOne(z => z.Depot)
            .HasForeignKey(z => z.DepotId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}