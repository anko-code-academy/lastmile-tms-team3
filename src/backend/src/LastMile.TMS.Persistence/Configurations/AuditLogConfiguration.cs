using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace LastMile.TMS.Persistence.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.ActionType)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(a => a.ResourceType)
            .HasConversion<string>()
            .IsRequired();

        builder.Property(a => a.ResourceId)
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(a => a.ActorUserId)
            .HasMaxLength(128);

        builder.Property(a => a.ActorUserName)
            .HasMaxLength(256);

        builder.Property(a => a.CorrelationId)
            .HasMaxLength(128);

        builder.Property(a => a.Summary)
            .HasMaxLength(500);

        builder.Property(a => a.BeforeValuesJson)
            .HasColumnType("jsonb");

        builder.Property(a => a.AfterValuesJson)
            .HasColumnType("jsonb");

        builder.HasIndex(a => a.OccurredAt);
        builder.HasIndex(a => a.ActorUserId);
        builder.HasIndex(a => a.ActorUserName)
            .HasMethod("GIN")
            .HasOperators("gin_trgm_ops");
        builder.HasIndex(a => a.ActionType);
        builder.HasIndex(a => a.CorrelationId);
        builder.HasIndex(a => a.ResourceType);
        builder.HasIndex(a => new { a.ResourceType, a.ResourceId });
    }
}