using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite;

namespace LastMile.TMS.Persistence.Configurations;

public class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Street1)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.Street2)
            .HasMaxLength(200);

        builder.Property(a => a.City)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.State)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.PostalCode)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(a => a.CountryCode)
            .IsRequired()
            .HasMaxLength(2);

        builder.Property(a => a.ContactName)
            .HasMaxLength(150);

        builder.Property(a => a.CompanyName)
            .HasMaxLength(200);

        builder.Property(a => a.Phone)
            .HasMaxLength(20);

        builder.Property(a => a.Email)
            .HasMaxLength(254);

        // Configure spatial property for PostGIS
        builder.Property(a => a.GeoLocation)
            .HasColumnType("geometry (point)");
            // SRID is configured globally via HasPostgresExtension in DbContext

        // Indexes
        builder.HasIndex(a => a.PostalCode);
        builder.HasIndex(a => a.CountryCode);
        builder.HasIndex(a => a.GeoLocation)
            .HasMethod("gist");
    }
}