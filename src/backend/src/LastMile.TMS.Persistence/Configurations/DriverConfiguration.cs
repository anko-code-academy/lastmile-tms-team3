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
            .HasColumnType("date")
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
            a.Property(p => p.Schedule)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => DeserializeSchedule(v))
                .HasColumnName("AvailabilitySchedule");

            a.Property(p => p.DaysOff)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => DeserializeDaysOff(v))
                .HasColumnName("AvailabilityDaysOff");
        });

        builder.HasIndex(d => d.IsActive);
        builder.HasIndex(d => d.ZoneId);
        builder.HasIndex(d => d.DepotId);
        builder.HasIndex(d => d.UserId);
        builder.HasIndex(d => d.CreatedAt);
        builder.HasIndex([nameof(Driver.FirstName)], "IX_Drivers_FirstName_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
        builder.HasIndex([nameof(Driver.LastName)], "IX_Drivers_LastName_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
        builder.HasIndex([nameof(Driver.Email)], "IX_Drivers_Email_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
        builder.HasIndex([nameof(Driver.LicenseNumber)], "IX_Drivers_LicenseNumber_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
    }

    private static List<DailyAvailability> DeserializeSchedule(string json)
    {
        return string.IsNullOrEmpty(json)
            ? new List<DailyAvailability>()
            : System.Text.Json.JsonSerializer.Deserialize<List<DailyAvailability>>(json) ?? new List<DailyAvailability>();
    }

    private static List<DayOff> DeserializeDaysOff(string json)
    {
        return string.IsNullOrEmpty(json)
            ? new List<DayOff>()
            : System.Text.Json.JsonSerializer.Deserialize<List<DayOff>>(json) ?? new List<DayOff>();
    }
}