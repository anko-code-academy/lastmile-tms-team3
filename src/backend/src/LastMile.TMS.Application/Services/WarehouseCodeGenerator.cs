using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Services;

public sealed class WarehouseCodeGenerator(IAppDbContextFactory contextFactory) : IWarehouseCodeGenerator
{
    public async Task<string> GenerateAisleCodeAsync(Guid zoneId, CancellationToken cancellationToken = default)
    {
        using var context = contextFactory.CreateDbContext();

        var existingCodes = await context.Aisles
            .AsNoTracking()
            .Where(aisle => aisle.ZoneId == zoneId)
            .Select(aisle => aisle.Code)
            .ToListAsync(cancellationToken);

        var existing = existingCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToUpperInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        for (var index = 1; ; index++)
        {
            var candidate = ToAlphabeticCode(index);
            if (!existing.Contains(candidate))
                return candidate;
        }
    }

    public async Task<string> GenerateBinCodeAsync(Guid aisleId, CancellationToken cancellationToken = default)
    {
        using var context = contextFactory.CreateDbContext();

        var aisle = await context.Aisles
            .AsNoTracking()
            .Where(item => item.Id == aisleId)
            .Select(item => new { item.Code })
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException($"Aisle with ID {aisleId} was not found.");

        var existingCodes = await context.Bins
            .AsNoTracking()
            .Where(bin => bin.AisleId == aisleId)
            .Select(bin => bin.Code)
            .ToListAsync(cancellationToken);

        var prefix = string.IsNullOrWhiteSpace(aisle.Code)
            ? "BIN"
            : aisle.Code.Trim().ToUpperInvariant();

        var existing = existingCodes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim().ToUpperInvariant())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        for (var index = 1; ; index++)
        {
            var candidate = $"{prefix}-{index:00}";
            if (!existing.Contains(candidate))
                return candidate;
        }
    }

    public string GenerateBinLabelCode(Guid zoneId, string aisleCode, string binCode)
    {
        var zoneSegment = zoneId.ToString("N")[..6].ToUpperInvariant();
        var aisleSegment = NormalizeSegment(aisleCode, 8);
        var binSegment = NormalizeSegment(binCode, 16);

        return $"BIN-{zoneSegment}-{aisleSegment}-{binSegment}";
    }

    private static string NormalizeSegment(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return "X";

        var normalized = new string(value
            .Trim()
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .ToArray());

        if (normalized.Length == 0)
            return "X";

        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }

    private static string ToAlphabeticCode(int index)
    {
        var remaining = index;
        var characters = new Stack<char>();

        while (remaining > 0)
        {
            remaining--;
            characters.Push((char)('A' + (remaining % 26)));
            remaining /= 26;
        }

        return new string(characters.ToArray());
    }
}