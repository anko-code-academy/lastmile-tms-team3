using System.Globalization;
using System.Text;
using System.Text.Json;
using CsvHelper;
using CsvHelper.Configuration;
using LastMile.TMS.Api.AuditLogs;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(
    Policy = "Admin",
    AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class AuditLogsController(
    IDbContextFactory<AppDbContext> dbContextFactory) : ControllerBase
{
    private static readonly JsonSerializerOptions ExportJsonSerializerOptions = new()
    {
        WriteIndented = false
    };

    [HttpGet("export")]
    public async Task<IActionResult> ExportAsync(
        [FromQuery] string? actor = null,
        [FromQuery] AuditActionType? actionType = null,
        [FromQuery] AuditResourceType? resourceType = null,
        [FromQuery] string? resourceId = null,
        [FromQuery] string? correlationId = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var parameters = new AuditLogQueryParameters(actor, actionType, resourceType, resourceId, correlationId, from, to);
        var rows = await context.AuditLogs
            .AsNoTracking()
            .ApplyAuditFilters(parameters)
            .OrderByDescending(log => log.OccurredAt)
            .Select(log => new AuditLogCsvRow(
                log.OccurredAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
                log.ActorUserId,
                log.ActorUserName,
                FormatEnum(log.ActionType),
                FormatEnum(log.ResourceType),
                log.ResourceId,
                log.Summary,
                log.CorrelationId,
                NormalizeJson(log.BeforeValuesJson),
                NormalizeJson(log.AfterValuesJson)))
            .ToListAsync(cancellationToken);

        await using var stream = new MemoryStream();
        var csvConfiguration = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            NewLine = "\r\n"
        };

        await using (var writer = new StreamWriter(stream, new UTF8Encoding(true), leaveOpen: true))
        await using (var csv = new CsvWriter(writer, csvConfiguration))
        {
            csv.Context.RegisterClassMap<AuditLogCsvRowMap>();
            await csv.WriteRecordsAsync(rows, cancellationToken);
            await writer.FlushAsync(cancellationToken);
        }

        stream.Position = 0;
        var fileName = $"audit-logs-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.csv";
        return File(stream.ToArray(), "text/csv", fileName);
    }

    private static string FormatEnum<TEnum>(TEnum value)
        where TEnum : struct, Enum
        => string.Join(' ', value.ToString().SplitCamelCaseAndUnderscores());

    private static string? NormalizeJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        try
        {
            using var document = JsonDocument.Parse(json);
            return JsonSerializer.Serialize(document.RootElement, ExportJsonSerializerOptions);
        }
        catch (JsonException)
        {
            return json;
        }
    }

    private sealed record AuditLogCsvRow(
        string OccurredAtUtc,
        string? ActorUserId,
        string? ActorUserName,
        string Action,
        string ResourceType,
        string ResourceId,
        string? Summary,
        string? CorrelationId,
        string? BeforeValues,
        string? AfterValues);

    private sealed class AuditLogCsvRowMap : ClassMap<AuditLogCsvRow>
    {
        public AuditLogCsvRowMap()
        {
            Map(x => x.OccurredAtUtc).Name("Occurred At (UTC)");
            Map(x => x.ActorUserId).Name("Actor User ID");
            Map(x => x.ActorUserName).Name("Actor User Name");
            Map(x => x.Action).Name("Action");
            Map(x => x.ResourceType).Name("Resource Type");
            Map(x => x.ResourceId).Name("Resource ID");
            Map(x => x.Summary).Name("Summary");
            Map(x => x.CorrelationId).Name("Correlation ID");
            Map(x => x.BeforeValues).Name("Before Values");
            Map(x => x.AfterValues).Name("After Values");
        }
    }
}

internal static class AuditLogStringExtensions
{
    public static IEnumerable<string> SplitCamelCaseAndUnderscores(this string value)
    {
        var builder = new StringBuilder();

        foreach (var character in value.Replace("_", " "))
        {
            if (builder.Length > 0 && char.IsUpper(character) && builder[^1] != ' ')
                builder.Append(' ');

            builder.Append(character);
        }

        return builder.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => char.ToUpperInvariant(segment[0]) + segment[1..].ToLowerInvariant());
    }
}