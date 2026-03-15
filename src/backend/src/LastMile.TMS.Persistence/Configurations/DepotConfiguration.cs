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
            a.Property(p => p.Street1).IsRequired().HasMaxLength(200).HasColumnName("Street1");
            a.Property(p => p.Street2).HasMaxLength(200).HasColumnName("Street2");
            a.Property(p => p.City).IsRequired().HasMaxLength(100).HasColumnName("City");
            a.Property(p => p.State).IsRequired().HasMaxLength(100).HasColumnName("State");
            a.Property(p => p.PostalCode).IsRequired().HasMaxLength(20).HasColumnName("PostalCode");
            a.Property(p => p.CountryCode).IsRequired().HasMaxLength(2).HasColumnName("CountryCode");
            a.Property(p => p.IsResidential).HasColumnName("IsResidential");
            a.Property(p => p.ContactName).HasMaxLength(150).HasColumnName("ContactName");
            a.Property(p => p.CompanyName).HasMaxLength(200).HasColumnName("CompanyName");
            a.Property(p => p.Phone).HasMaxLength(20).HasColumnName("Phone");
            a.Property(p => p.Email).HasMaxLength(254).HasColumnName("Email");
            a.Property(p => p.GeoLocation).HasColumnType("geometry (point)").HasColumnName("GeoLocation");
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