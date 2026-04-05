using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

internal static class VehicleSearchExtensions
{
    public static IQueryable<Vehicle> ApplySearch(this IQueryable<Vehicle> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var trimmedSearch = search.Trim();
        var prefixPattern = EscapeLikePattern(trimmedSearch) + "%";

        return query.Where(vehicle =>
            EF.Functions.ILike(vehicle.RegistrationPlate, prefixPattern));
    }

    private static string EscapeLikePattern(string input)
        => input
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}