using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class TrackingEventConfiguration : IEntityTypeConfiguration<TrackingEvent>
{
    public void Configure(EntityTypeBuilder<TrackingEvent> builder)
    {
        builder.HasKey(te => te.Id);

        // Relationship with Parcel
        builder.HasOne(te => te.Parcel)
            .WithMany(p => p.TrackingEvents)
            .HasForeignKey(te => te.ParcelId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        builder.Property(te => te.Timestamp)
            .IsRequired();

        builder.Property(te => te.EventType)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(te => te.Description)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(te => te.LocationCity)
            .HasMaxLength(100);

        builder.Property(te => te.LocationState)
            .HasMaxLength(100);

        builder.Property(te => te.LocationCountryCode)
            .HasMaxLength(2);

        builder.Property(te => te.Operator)
            .HasMaxLength(150);

        builder.Property(te => te.DelayReason)
            .HasMaxLength(500);

        // Indexes
        builder.HasIndex(te => te.ParcelId);
        builder.HasIndex(te => te.Timestamp);
        builder.HasIndex(te => te.EventType);
    }
}