using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class DriverConfiguration : IEntityTypeConfiguration<Driver>
{
    public void Configure(EntityTypeBuilder<Driver> builder)
    {
        builder.ToTable("Drivers");

        builder.HasKey(d => d.Id);

        builder.Property(d => d.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.Phone)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(d => d.Email)
            .IsRequired()
            .HasMaxLength(254);

        builder.Property(d => d.LicenseNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(d => d.LicenseExpiryDate)
            .IsRequired();

        builder.Property(d => d.PhotoUrl)
            .HasMaxLength(500);

        builder.Property(d => d.IsActive)
            .HasDefaultValue(true);

        builder.Property(d => d.UserId)
            .HasColumnName("UserId");

        builder.HasOne(d => d.Zone)
            .WithMany()
            .HasForeignKey(d => d.ZoneId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.Depot)
            .WithMany()
            .HasForeignKey(d => d.DepotId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.OwnsOne(d => d.Availability, a =>
        {
            a.Property(p => p.ShiftStart)
                .HasColumnName("ShiftStart");
            a.Property(p => p.ShiftEnd)
                .HasColumnName("ShiftEnd");
            a.Property(p => p.DaysOff)
                .HasConversion(
                    v => string.Join(',', v.Select(d => (int)d)),
                    v => v.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => (DayOfWeek)int.Parse(s))
                        .ToArray())
                .HasColumnName("DaysOff");
        });

        builder.HasIndex(d => d.IsActive);
        builder.HasIndex(d => d.ZoneId);
        builder.HasIndex(d => d.DepotId);
        builder.HasIndex(d => d.UserId);
    }
}