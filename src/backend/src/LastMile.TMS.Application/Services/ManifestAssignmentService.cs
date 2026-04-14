using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Services;

public class ManifestAssignmentService : IManifestAssignmentService
{
    private static readonly Random _random = new();

    public async Task<InboundManifest> AssignParcelToManifestAsync(
        IAppDbContext context,
        Guid parcelId,
        Guid depotId,
        CancellationToken cancellationToken = default)
    {
        // Find an open manifest for this depot that hasn't reached its cap
        var openManifests = await context.InboundManifests
            .Include(m => m.Parcels)
            .Where(m => m.DepotId == depotId && m.Status == InboundManifestStatus.Open)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        InboundManifest? manifest = openManifests
            .FirstOrDefault(m => m.Parcels.Count < m.MaxParcels);

        if (manifest is null)
        {
            manifest = await CreateNewManifestAsync(context, depotId, cancellationToken);
        }

        var parcel = await context.Parcels.FindAsync(new object[] { parcelId }, cancellationToken);
        if (parcel is not null)
        {
            AddParcelToManifest(manifest, parcel);
        }

        return manifest;
    }

    public async Task AssignParcelsToManifestsAsync(
        IAppDbContext context,
        IReadOnlyList<(Guid ParcelId, Guid DepotId)> parcelDepotPairs,
        CancellationToken cancellationToken = default)
    {
        var byDepot = parcelDepotPairs
            .GroupBy(p => p.DepotId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.ParcelId).ToList());

        foreach (var (depotId, parcelIds) in byDepot)
        {
            // Load open manifests once per depot
            var openManifests = await context.InboundManifests
                .Include(m => m.Parcels)
                .Where(m => m.DepotId == depotId && m.Status == InboundManifestStatus.Open)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync(cancellationToken);

            // Pre-compute sequence base for new manifest numbers
            var now = DateTimeOffset.UtcNow;
            var baseSeq = await context.InboundManifests
                .CountAsync(m => m.DepotId == depotId && m.CreatedAt.Date == now.Date, cancellationToken);
            var nextSeq = baseSeq + 1;

            // Track manifests created in this batch so they're available for subsequent parcels
            var batchManifests = new List<InboundManifest>(openManifests);

            foreach (var parcelId in parcelIds)
            {
                var parcel = await context.Parcels.FindAsync(new object[] { parcelId }, cancellationToken);
                if (parcel is null) continue;

                // Find a manifest with room (includes manifests created/modified in this loop)
                var manifest = batchManifests.FirstOrDefault(m => m.Status == InboundManifestStatus.Open && m.Parcels.Count < m.MaxParcels);

                if (manifest is null)
                {
                    manifest = new InboundManifest
                    {
                        Id = Guid.NewGuid(),
                        ManifestNumber = $"MFT-{now:yyyyMMdd}-{nextSeq:D3}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}",
                        DepotId = depotId,
                        Status = InboundManifestStatus.Open,
                        MaxParcels = _random.Next(8, 11),
                        CreatedAt = now,
                        CreatedBy = "system"
                    };
                    nextSeq++;

                    context.InboundManifests.Add(manifest);
                    batchManifests.Add(manifest);
                }

                AddParcelToManifest(manifest, parcel);
            }
        }
    }

    private static void AddParcelToManifest(InboundManifest manifest, Parcel parcel)
    {
        manifest.Parcels.Add(parcel);

        if (manifest.Parcels.Count >= manifest.MaxParcels)
        {
            manifest.Status = InboundManifestStatus.Sealed;
        }
    }

    private async Task<InboundManifest> CreateNewManifestAsync(
        IAppDbContext context,
        Guid depotId,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var todayManifests = await context.InboundManifests
            .CountAsync(m => m.DepotId == depotId && m.CreatedAt.Date == now.Date, cancellationToken);

        var manifest = new InboundManifest
        {
            Id = Guid.NewGuid(),
            ManifestNumber = $"MFT-{now:yyyyMMdd}-{(todayManifests + 1):D3}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}",
            DepotId = depotId,
            Status = InboundManifestStatus.Open,
            MaxParcels = _random.Next(8, 11),
            CreatedAt = now,
            CreatedBy = "system"
        };

        context.InboundManifests.Add(manifest);
        return manifest;
    }
}
