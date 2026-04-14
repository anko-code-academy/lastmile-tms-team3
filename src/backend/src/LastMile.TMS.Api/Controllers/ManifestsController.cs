using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Validation.AspNetCore;

namespace LastMile.TMS.Api.Controllers;

[ApiController]
[Route("api/manifests")]
[Authorize(Policy = "AdminOrDepotOperator", AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class ManifestsController : ControllerBase
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly IManifestService _manifestService;

    public ManifestsController(IAppDbContextFactory contextFactory, IManifestService manifestService)
    {
        _contextFactory = contextFactory;
        _manifestService = manifestService;
    }

    [HttpGet("{routeId:guid}/pdf")]
    public async Task<IActionResult> DownloadManifest(Guid routeId, CancellationToken cancellationToken)
    {
        var context = _contextFactory.CreateDbContext();
        var route = await context.DeliveryRoutes
            .AsNoTracking()
            .Include(r => r.Depot)
            .Include(r => r.Driver)
            .Include(r => r.Zone)
            .Include(r => r.Parcels).ThenInclude(p => p.RecipientAddress)
            .FirstOrDefaultAsync(r => r.Id == routeId, cancellationToken);

        if (route == null)
            return NotFound($"Route {routeId} not found");

        var pdfBytes = _manifestService.GenerateManifest(route);
        var fileName = $"manifest-{route.Name}-{route.Date:yyyy-MM-dd}.pdf";
        return File(pdfBytes, "application/pdf", fileName);
    }
}
