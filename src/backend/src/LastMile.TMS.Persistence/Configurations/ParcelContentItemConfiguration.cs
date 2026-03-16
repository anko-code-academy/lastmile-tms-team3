using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class ParcelContentItemConfiguration : IEntityTypeConfiguration<ParcelContentItem>
{
    public void Configure(EntityTypeBuilder<ParcelContentItem> builder)
    {
        builder.HasKey(pci => pci.Id);

        // Relationship with Parcel
        builder.HasOne(pci => pci.Parcel)
            .WithMany(p => p.ContentItems)
            .HasForeignKey(pci => pci.ParcelId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        builder.Property(pci => pci.HsCode)
            .IsRequired()
            .HasMaxLength(7); // Format: XXXX.XX

        builder.Property(pci => pci.Description)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(pci => pci.Quantity)
            .IsRequired();

        builder.Property(pci => pci.UnitValue)
            .HasPrecision(15, 2);

        builder.Property(pci => pci.Currency)
            .HasMaxLength(3)
            .HasDefaultValue("USD");

        builder.Property(pci => pci.Weight)
            .HasPrecision(10, 3);

        builder.Property(pci => pci.WeightUnit)
            .HasConversion<string>();

        builder.Property(pci => pci.OriginCountryCode)
            .IsRequired()
            .HasMaxLength(2); // ISO 3166-1 alpha-2

        // Indexes
        builder.HasIndex(pci => pci.HsCode);
        builder.HasIndex(pci => pci.OriginCountryCode);
    }
}