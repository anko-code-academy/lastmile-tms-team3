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
            oh.Property(p => p.Schedule)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => DeserializeSchedule(v))
                .HasColumnName("OperatingHoursSchedule");

            oh.Property(p => p.DaysOff)
                .HasConversion(
                    v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                    v => DeserializeDaysOff(v))
                .HasColumnName("OperatingHoursDaysOff");
        });

        builder.HasMany(d => d.Zones)
            .WithOne(z => z.Depot)
            .HasForeignKey(z => z.DepotId)
            .OnDelete(DeleteBehavior.Cascade);
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