using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite;

namespace LastMile.TMS.Persistence.Configurations;

public class DeliveryConfirmationConfiguration : IEntityTypeConfiguration<DeliveryConfirmation>
{
    public void Configure(EntityTypeBuilder<DeliveryConfirmation> builder)
    {
        builder.HasKey(dc => dc.Id);

        // Relationship with Parcel (one-to-one)
        builder.HasOne(dc => dc.Parcel)
            .WithOne(p => p.DeliveryConfirmation)
            .HasForeignKey<DeliveryConfirmation>(dc => dc.ParcelId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        builder.Property(dc => dc.ReceivedBy)
            .HasMaxLength(200);

        builder.Property(dc => dc.DeliveryLocation)
            .HasMaxLength(200);

        builder.Property(dc => dc.SignatureImage);

        builder.Property(dc => dc.Photo);

        builder.Property(dc => dc.DeliveredAt)
            .IsRequired();

        // Configure spatial point for delivery location
        builder.Property(dc => dc.DeliveryGeoLocation)
            .HasColumnType("geometry (point)");
            // SRID is configured globally via HasPostgresExtension in DbContext

        builder.HasIndex(dc => dc.DeliveredAt);
        builder.HasIndex(dc => dc.ParcelId)
            .IsUnique();
    }
}