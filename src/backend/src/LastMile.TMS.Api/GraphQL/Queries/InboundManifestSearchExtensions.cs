using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

internal static class InboundManifestSearchExtensions
{
    public static IQueryable<InboundManifest> ApplySearch(this IQueryable<InboundManifest> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var trimmedSearch = search.Trim();
        var prefixPattern = EscapeLikePattern(trimmedSearch) + "%";

        return query.Where(manifest =>
            EF.Functions.ILike(manifest.ManifestNumber, prefixPattern) ||
            manifest.Parcels.Any(p => EF.Functions.ILike(p.TrackingNumber, prefixPattern)));
    }

    private static string EscapeLikePattern(string input)
        => input
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}
