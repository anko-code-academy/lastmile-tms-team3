using LastMile.TMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

internal static class DriverSearchExtensions
{
    public static IQueryable<Driver> ApplySearch(this IQueryable<Driver> query, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var trimmedSearch = search.Trim();
        var prefixPattern = EscapeLikePattern(trimmedSearch) + "%";

        return query.Where(driver =>
            EF.Functions.ILike(driver.FirstName, prefixPattern) ||
            EF.Functions.ILike(driver.LastName, prefixPattern) ||
            EF.Functions.ILike(driver.Email, prefixPattern) ||
            EF.Functions.ILike(driver.LicenseNumber, prefixPattern));
    }

    private static string EscapeLikePattern(string input)
        => input
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("%", "\\%", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal);
}