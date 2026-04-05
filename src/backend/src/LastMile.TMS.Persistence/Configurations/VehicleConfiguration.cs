using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class VehicleConfiguration : IEntityTypeConfiguration<Vehicle>
{
    public void Configure(EntityTypeBuilder<Vehicle> builder)
    {
        builder.ToTable("Vehicles");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.RegistrationPlate)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(v => v.RegistrationPlate)
            .IsUnique();

        builder.Property(v => v.Type)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(v => v.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(v => v.ParcelCapacity)
            .IsRequired();

        builder.Property(v => v.WeightCapacity)
            .IsRequired();

        builder.Property(v => v.WeightUnit)
            .IsRequired()
            .HasConversion<string>();

        // Relationships
        builder.HasOne(v => v.Depot)
            .WithMany(d => d.Vehicles)
            .HasForeignKey(v => v.DepotId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(v => v.CreatedAt);
        builder.HasIndex(v => v.Status);
        builder.HasIndex(v => v.Type);
        builder.HasIndex(v => v.DepotId);
        builder.HasIndex([nameof(Vehicle.RegistrationPlate)], "IX_Vehicles_RegistrationPlate_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
    }
}