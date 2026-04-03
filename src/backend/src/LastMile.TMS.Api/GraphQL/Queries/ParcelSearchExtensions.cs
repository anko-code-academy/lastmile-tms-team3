using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace LastMile.TMS.Api.GraphQL.Queries;

internal static class ParcelSearchExtensions
{
    public static IQueryable<Parcel> ApplySearch(this IQueryable<Parcel> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var trimmedSearch = search.Trim();
        var prefixPattern = EscapeLikePattern(trimmedSearch) + "%";

        return query.Where(parcel =>
            EF.Functions.ILike(parcel.TrackingNumber, prefixPattern) ||
            EF.Functions.ILike(parcel.RecipientAddress.City, prefixPattern) ||
            EF.Functions.ILike(parcel.ShipperAddress.City, prefixPattern) ||
            EF.Property<NpgsqlTsVector>(parcel.RecipientAddress, "SearchVector")
                .Matches(EF.Functions.PlainToTsQuery("simple", trimmedSearch)) ||
            EF.Property<NpgsqlTsVector>(parcel.ShipperAddress, "SearchVector")
                .Matches(EF.Functions.PlainToTsQuery("simple", trimmedSearch)));
    }

    private static string EscapeLikePattern(string input)
        => input
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}