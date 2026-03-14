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

        builder.OwnsOne(d => d.Address, a =>
        {
            a.Property(p => p.Street).HasMaxLength(500).HasColumnName("Street");
            a.Property(p => p.City).HasMaxLength(100).HasColumnName("City");
            a.Property(p => p.State).HasMaxLength(100).HasColumnName("State");
            a.Property(p => p.PostalCode).HasMaxLength(20).HasColumnName("PostalCode");
            a.Property(p => p.Country).HasMaxLength(100).HasColumnName("Country");
            a.Property(p => p.Latitude).HasColumnName("Latitude");
            a.Property(p => p.Longitude).HasColumnName("Longitude");
        });

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