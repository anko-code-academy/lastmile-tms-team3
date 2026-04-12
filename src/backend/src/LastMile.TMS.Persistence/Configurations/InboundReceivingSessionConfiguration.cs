using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LastMile.TMS.Persistence.Configurations;

public class InboundReceivingSessionConfiguration : IEntityTypeConfiguration<InboundReceivingSession>
{
    public void Configure(EntityTypeBuilder<InboundReceivingSession> builder)
    {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.DockDoor)
            .HasMaxLength(20);

        builder.Property(e => e.ConfirmedBy)
            .HasMaxLength(200);

        builder.HasIndex(e => e.Status);

        builder.HasOne(e => e.Manifest)
            .WithMany(m => m.Sessions)
            .HasForeignKey(e => e.ManifestId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
