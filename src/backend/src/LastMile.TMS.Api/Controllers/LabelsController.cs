using HotChocolate;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/labels")]
[Authorize(Policy = "AdminOrOperationsManager", AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class LabelsController : ControllerBase
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly ILabelService _labelService;

    public LabelsController(IAppDbContextFactory contextFactory, ILabelService labelService)
    {
        _contextFactory = contextFactory;
        _labelService = labelService;
    }

    [HttpGet("{parcelId:guid}/pdf")]
    public async Task<IActionResult> DownloadPdf(Guid parcelId, CancellationToken cancellationToken)
    {
        var context = _contextFactory.CreateDbContext();
        var parcel = await context.Parcels
            .AsNoTracking()
            .Include(p => p.RecipientAddress)
            .Include(p => p.ShipperAddress)
            .Include(p => p.Zone)
            .FirstOrDefaultAsync(p => p.Id == parcelId, cancellationToken);

        if (parcel == null)
            return NotFound($"Parcel {parcelId} not found");

        var pdfBytes = _labelService.GeneratePdf(parcel);
        var fileName = $"label-{parcel.TrackingNumber}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }

    [HttpGet("{parcelId:guid}/zpl")]
    public async Task<IActionResult> DownloadZpl(Guid parcelId, CancellationToken cancellationToken)
    {
        var context = _contextFactory.CreateDbContext();
        var parcel = await context.Parcels
            .AsNoTracking()
            .Include(p => p.RecipientAddress)
            .Include(p => p.ShipperAddress)
            .Include(p => p.Zone)
            .FirstOrDefaultAsync(p => p.Id == parcelId, cancellationToken);

        if (parcel == null)
            return NotFound($"Parcel {parcelId} not found");

        var zpl = _labelService.GenerateZpl(parcel);
        var fileName = $"label-{parcel.TrackingNumber}.zpl";
        return File(System.Text.Encoding.UTF8.GetBytes(zpl), "application/octet-stream", fileName);
    }

    [HttpGet("bulk/pdf")]
    public async Task<IActionResult> DownloadBulkPdf([FromQuery] Guid[] ids, CancellationToken cancellationToken)
    {
        if (ids == null || ids.Length == 0)
            return BadRequest("No parcel IDs provided");

        var context = _contextFactory.CreateDbContext();
        var parcels = await context.Parcels
            .AsNoTracking()
            .Include(p => p.RecipientAddress)
            .Include(p => p.ShipperAddress)
            .Include(p => p.Zone)
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(cancellationToken);

        if (parcels.Count == 0)
            return NotFound("No parcels found for the provided IDs");

        var pdfBytes = _labelService.GenerateBulkPdf(parcels);
        var fileName = $"labels-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }
}
