using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class ParcelImportHistoryConfiguration : IEntityTypeConfiguration<ParcelImportHistory>
{
    public void Configure(EntityTypeBuilder<ParcelImportHistory> builder)
    {
        builder.ToTable("ParcelImportHistories");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.FileName)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(x => x.FileType)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(x => x.FileSizeBytes)
            .IsRequired();

        builder.Property(x => x.TotalRows)
            .IsRequired();

        builder.Property(x => x.ValidRows)
            .IsRequired();

        builder.Property(x => x.InvalidRows)
            .IsRequired();

        builder.Property(x => x.ParcelsCreated)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<string>();

        builder.Property(x => x.CorrelationId)
            .HasMaxLength(100);

        builder.Property(x => x.RowErrorsData)
            .HasColumnType("text");

        builder.Property(x => x.PreviewData)
            .HasColumnType("text");

        builder.HasIndex(x => x.CorrelationId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.CreatedAt);
    }
}