using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite;
using NpgsqlTypes;

namespace LastMile.TMS.Persistence.Configurations;

public class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    internal const string SearchVectorPropertyName = "SearchVector";

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

        builder.Property<NpgsqlTsVector>(SearchVectorPropertyName)
            .HasColumnType("tsvector")
            .HasComputedColumnSql(
                "to_tsvector('simple', coalesce(\"ContactName\", '') || ' ' || coalesce(\"CompanyName\", '') || ' ' || coalesce(\"Street1\", '') || ' ' || coalesce(\"Street2\", ''))",
                stored: true);

        // Configure spatial property for PostGIS
        builder.Property(a => a.GeoLocation)
            .HasColumnType("geometry (point)");
            // SRID is configured globally via HasPostgresExtension in DbContext

        // Indexes
        builder.HasIndex(a => a.PostalCode);
        builder.HasIndex(a => a.CountryCode);
        builder.HasIndex(a => a.GeoLocation)
            .HasMethod("gist");
        builder.HasIndex(SearchVectorPropertyName)
            .HasMethod("GIN");
        builder.HasIndex([nameof(Address.City)], "IX_Addresses_City_Trgm")
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
    }
}