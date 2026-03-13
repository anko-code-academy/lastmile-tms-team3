using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class ParcelConfiguration : IEntityTypeConfiguration<Parcel>
{
    public void Configure(EntityTypeBuilder<Parcel> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.TrackingNumber)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(p => p.TrackingNumber)
            .IsUnique();

        builder.Property(p => p.Description)
            .HasMaxLength(500);

        builder.Property(p => p.ServiceType)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .IsRequired();

        // Relationships
        builder.HasOne(p => p.ShipperAddress)
            .WithMany()
            .HasForeignKey(p => p.ShipperAddressId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        builder.HasOne(p => p.RecipientAddress)
            .WithMany()
            .HasForeignKey(p => p.RecipientAddressId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        
        // Physical properties
        builder.Property(p => p.Weight)
            .HasPrecision(10, 3);

        builder.Property(p => p.WeightUnit)
            .HasConversion<string>();

        builder.Property(p => p.Length)
            .HasPrecision(10, 2);

        builder.Property(p => p.Width)
            .HasPrecision(10, 2);

        builder.Property(p => p.Height)
            .HasPrecision(10, 2);

        builder.Property(p => p.DimensionUnit)
            .HasConversion<string>();

        // Value
        builder.Property(p => p.DeclaredValue)
            .HasPrecision(15, 2);

        builder.Property(p => p.Currency)
            .HasMaxLength(3)
            .HasDefaultValue("USD");

        // Dates
        builder.Property(p => p.EstimatedDeliveryDate);
        builder.Property(p => p.ActualDeliveryDate);

        // Delivery tracking
        builder.Property(p => p.DeliveryAttempts)
            .HasDefaultValue(0);

        // ParcelType
        builder.Property(p => p.ParcelType)
            .HasMaxLength(100);

        // Indexes
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.CreatedAt);
        builder.HasIndex(p => p.EstimatedDeliveryDate);
    }
}