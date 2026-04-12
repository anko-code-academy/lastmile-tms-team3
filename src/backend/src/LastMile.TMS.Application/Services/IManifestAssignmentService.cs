using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Services;

public interface IManifestAssignmentService
{
    Task<InboundManifest> AssignParcelToManifestAsync(
        IAppDbContext context,
        Guid parcelId,
        Guid depotId,
        CancellationToken cancellationToken = default);

    Task AssignParcelsToManifestsAsync(
        IAppDbContext context,
        IReadOnlyList<(Guid ParcelId, Guid DepotId)> parcelDepotPairs,
        CancellationToken cancellationToken = default);
}
