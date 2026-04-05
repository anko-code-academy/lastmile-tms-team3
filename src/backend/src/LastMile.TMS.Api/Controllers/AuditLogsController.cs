using System.Globalization;
using CsvHelper;
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
    [HttpGet("export")]
    public async Task<IActionResult> ExportAsync(
        [FromQuery] string? actor = null,
        [FromQuery] AuditActionType? actionType = null,
        [FromQuery] AuditResourceType? resourceType = null,
        [FromQuery] string? resourceId = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        CancellationToken cancellationToken = default)
    {
        await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var parameters = new AuditLogQueryParameters(actor, actionType, resourceType, resourceId, from, to);
        var rows = await context.AuditLogs
            .AsNoTracking()
            .ApplyAuditFilters(parameters)
            .OrderByDescending(log => log.OccurredAt)
            .Select(log => new AuditLogCsvRow(
                log.OccurredAt,
                log.ActorUserId,
                log.ActorUserName,
                log.ActionType,
                log.ResourceType,
                log.ResourceId,
                log.Summary,
                log.CorrelationId,
                log.BeforeValuesJson,
                log.AfterValuesJson))
            .ToListAsync(cancellationToken);

        await using var stream = new MemoryStream();
        await using (var writer = new StreamWriter(stream, leaveOpen: true))
        await using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            await csv.WriteRecordsAsync(rows, cancellationToken);
            await writer.FlushAsync(cancellationToken);
        }

        stream.Position = 0;
        var fileName = $"audit-logs-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.csv";
        return File(stream.ToArray(), "text/csv", fileName);
    }

    private sealed record AuditLogCsvRow(
        DateTimeOffset OccurredAt,
        string? ActorUserId,
        string? ActorUserName,
        AuditActionType ActionType,
        AuditResourceType ResourceType,
        string ResourceId,
        string? Summary,
        string? CorrelationId,
        string? BeforeValuesJson,
        string? AfterValuesJson);
}