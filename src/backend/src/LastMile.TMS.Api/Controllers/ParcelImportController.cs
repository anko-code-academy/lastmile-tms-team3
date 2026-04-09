using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/parcel-imports")]
[Authorize(Policy = "AdminOrOperationsManager")]
public class ParcelImportController : ControllerBase
{
    private readonly IParcelImportService _importService;
    private readonly ILogger<ParcelImportController> _logger;

    public ParcelImportController(IParcelImportService importService, ILogger<ParcelImportController> logger)
    {
        _importService = importService;
        _logger = logger;
    }

    /// <summary>
    /// Download CSV template for parcel import
    /// </summary>
    [HttpGet("template")]
    public IActionResult GetCsvTemplate()
    {
        var csv = @"RecipientContactName,RecipientCompanyName,RecipientStreet1,RecipientStreet2,RecipientCity,RecipientState,RecipientPostalCode,RecipientCountryCode,RecipientPhone,RecipientEmail,RecipientIsResidential,ShipperContactName,ShipperCompanyName,ShipperStreet1,ShipperStreet2,ShipperCity,ShipperState,ShipperPostalCode,ShipperCountryCode,ShipperPhone,ShipperEmail,ShipperIsResidential,Weight,WeightUnit,Length,Width,Height,DimensionUnit,DeclaredValue,Currency,ServiceType,ParcelType,Description,Notes
John Doe,Acme Corp,123 Main St,Suite 100,Nashville,TN,37211,US,+16155551234,john@example.com,false,Jane Smith,ShipCo LLC,456 Warehouse Dr,,Louisville,KY,40201,US,+15025559876,ship@example.com,false,5.5,LB,10,8,6,IN,25.99,USD,STANDARD,Documents,Important documents,Handle with care";

        var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "parcel-import-template.csv");
    }

    /// <summary>
    /// Download XLSX template for parcel import
    /// </summary>
    [HttpGet("template/xlsx")]
    public IActionResult GetXlsxTemplate()
    {
        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Parcels");

        var headers = new[]
        {
            "RecipientContactName", "RecipientCompanyName", "RecipientStreet1", "RecipientStreet2",
            "RecipientCity", "RecipientState", "RecipientPostalCode", "RecipientCountryCode",
            "RecipientPhone", "RecipientEmail", "RecipientIsResidential",
            "ShipperContactName", "ShipperCompanyName", "ShipperStreet1", "ShipperStreet2",
            "ShipperCity", "ShipperState", "ShipperPostalCode", "ShipperCountryCode",
            "ShipperPhone", "ShipperEmail", "ShipperIsResidential",
            "Weight", "WeightUnit", "Length", "Width", "Height", "DimensionUnit",
            "DeclaredValue", "Currency", "ServiceType", "ParcelType", "Description", "Notes"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
        }

        // Sample row
        var sampleData = new object[]
        {
            "John Doe", "Acme Corp", "123 Main St", "Suite 100", "Nashville", "TN", "37211", "US",
            "+16155551234", "john@example.com", false,
            "Jane Smith", "ShipCo LLC", "456 Warehouse Dr", "", "Louisville", "KY", "40201", "US",
            "+15025559876", "ship@example.com", false,
            "5.5", "LB", "10", "8", "6", "IN", "25.99", "USD", "STANDARD", "Documents", "Important documents", "Handle with care"
        };

        for (var i = 0; i < sampleData.Length; i++)
        {
            worksheet.Cell(2, i + 1).Value = sampleData[i]?.ToString() ?? "";
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "parcel-import-template.xlsx");
    }

    /// <summary>
    /// Upload file and get preview with validation results
    /// </summary>
    [HttpPost("preview")]
    [RequestSizeLimit(10_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 10_000_000)]
    public async Task<ActionResult<ParcelImportPreviewDto>> Preview(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var fileName = file.FileName.ToLowerInvariant();
        if (!fileName.EndsWith(".csv") && !fileName.EndsWith(".xlsx") && !fileName.EndsWith(".xls"))
            return BadRequest("Unsupported file format. Please upload a CSV or XLSX file.");

        var contentType = file.ContentType.ToLowerInvariant();
        var validContentTypes = new[]
        {
            "text/csv", "text/plain", "application/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/octet-stream"
        };
        if (!validContentTypes.Contains(contentType))
            return BadRequest("Invalid file content type.");
        var fileType = fileName.EndsWith(".xlsx") || fileName.EndsWith(".xls")
            ? ImportFileType.Xlsx
            : ImportFileType.Csv;

        await using var stream = file.OpenReadStream();
        var preview = await _importService.ParseAndValidateAsync(stream, file.FileName, fileType, cancellationToken);

        _logger.LogInformation("Import preview generated: {ImportId}, {TotalRows} rows, {ValidRows} valid",
            preview.ImportId, preview.TotalRows, preview.ValidRows);

        return Ok(preview);
    }

    /// <summary>
    /// Confirm and execute the import
    /// </summary>
    [HttpPost("confirm")]
    public async Task<ActionResult<ParcelImportResultDto>> Confirm([FromBody] ParcelImportConfirmDto confirmDto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _importService.ExecuteImportAsync(confirmDto.ImportId, cancellationToken);

            _logger.LogInformation("Import executed: {ImportId}, {ParcelsCreated} parcels created",
                confirmDto.ImportId, result.ParcelsCreated);

            return Ok(result);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Import already in progress or completed: {ImportId}", confirmDto.ImportId);
            return Conflict(new { error = "This import is already being processed or has been completed." });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Import failed: {ImportId}", confirmDto.ImportId);
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get import result by ID
    /// </summary>
    [HttpGet("{importId:guid}")]
    public async Task<ActionResult<ParcelImportResultDto>> GetResult(Guid importId, CancellationToken cancellationToken)
    {
        var result = await _importService.GetImportResultAsync(importId, cancellationToken);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    /// <summary>
    /// Get import history (past imports)
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<IReadOnlyList<ImportHistoryDto>>> GetHistory(CancellationToken cancellationToken)
    {
        var history = await _importService.GetImportHistoryAsync(cancellationToken);
        return Ok(history);
    }
}