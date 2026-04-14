using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

public class BinByTrackingNumberPayload
{
    public Bin? Bin { get; set; }
    public string? NotFoundReason { get; set; }

    public BinByTrackingNumberPayload(Bin? bin, string? notFoundReason)
    {
        Bin = bin;
        NotFoundReason = notFoundReason;
    }
}

[ExtendObjectType(OperationTypeNames.Query)]
public class BinQuery
{
    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseFirstOrDefault]
    [UseProjection]
    public IQueryable<Bin> GetBin(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid id)
        => context.Bins
            .AsNoTracking()
            .ApplyWarehouseScope(currentUser)
            .Where(bin => bin.Id == id);

    [Authorize(Policy = "AdminOrWarehouseManager")]
    [UseProjection]
    public IQueryable<Bin> GetBins(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        Guid? depotId = null,
        Guid? zoneId = null,
        Guid? aisleId = null,
        bool? includeInactive = null)
    {
        var query = context.Bins
            .AsNoTracking()
            .ApplyWarehouseScope(currentUser);

        if (depotId.HasValue)
            query = query.Where(bin => bin.Aisle.Zone.DepotId == depotId.Value);

        if (zoneId.HasValue)
            query = query.Where(bin => bin.Aisle.ZoneId == zoneId.Value);

        if (aisleId.HasValue)
            query = query.Where(bin => bin.AisleId == aisleId.Value);

        if (includeInactive != true)
            query = query.Where(bin =>
                bin.IsActive &&
                bin.Aisle.IsActive &&
                bin.Aisle.Zone.IsActive &&
                bin.Aisle.Zone.Depot.IsActive);

        return query;
    }

    [Authorize(Policy = "AdminOrWarehouseManager")]
    public BinByTrackingNumberPayload GetBinByTrackingNumber(
        AppDbContext context,
        [Service] ICurrentUserService currentUser,
        string trackingNumber,
        Guid? depotId = null)
    {
        var parcelInfo = context.Parcels
            .AsNoTracking()
            .Where(p => p.TrackingNumber == trackingNumber)
            .Select(p => new { p.Id, p.CurrentBinId })
            .FirstOrDefault();

        if (parcelInfo is null)
            return new BinByTrackingNumberPayload(null, "NOT_FOUND");

        if (parcelInfo.CurrentBinId is null)
            return new BinByTrackingNumberPayload(null, "NOT_IN_BIN");

        var bin = context.Bins
            .AsNoTracking()
            .Include(bin => bin.Aisle)
                .ThenInclude(aisle => aisle.Zone)
                    .ThenInclude(zone => zone.Depot)
            .ApplyWarehouseScope(currentUser)
            .Where(bin => bin.Id == parcelInfo.CurrentBinId.Value)
            .FirstOrDefault();

        if (bin is null)
            return new BinByTrackingNumberPayload(null, "NOT_FOUND");

        if (depotId.HasValue && bin.Aisle.Zone.DepotId != depotId.Value)
            return new BinByTrackingNumberPayload(null, "NOT_FOUND");

        return new BinByTrackingNumberPayload(bin, null);
    }
}