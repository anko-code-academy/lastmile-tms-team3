using HotChocolate.Authorization;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class LabelQuery
{
    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<ParcelLabelDto?> GetParcelLabel(
        AppDbContext context,
        ILabelService labelService,
        Guid id)
    {
        var parcel = await context.Parcels
            .AsNoTracking()
            .Include(p => p.RecipientAddress)
            .Include(p => p.ShipperAddress)
            .Include(p => p.Zone)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (parcel == null) return null;

        var recipient = parcel.RecipientAddress;
        var recipientName = !string.IsNullOrWhiteSpace(recipient.ContactName)
            ? recipient.ContactName
            : recipient.CompanyName ?? "";
        var recipientAddress = FormatAddress(recipient);

        var pdfBytes = labelService.GeneratePdf(parcel);
        var pdfBase64 = Convert.ToBase64String(pdfBytes);

        return new ParcelLabelDto(
            parcel.Id,
            parcel.TrackingNumber,
            parcel.BarcodeData ?? parcel.TrackingNumber,
            recipientName,
            recipientAddress,
            parcel.Zone?.Name,
            parcel.ParcelType,
            parcel.ServiceType.ToString(),
            pdfBase64
        );
    }

    [Authorize(Policy = "AdminOrOperationsManager")]
    public async Task<string?> GetParcelLabelZpl(
        AppDbContext context,
        ILabelService labelService,
        Guid id)
    {
        var parcel = await context.Parcels
            .AsNoTracking()
            .Include(p => p.RecipientAddress)
            .Include(p => p.ShipperAddress)
            .Include(p => p.Zone)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (parcel == null) return null;

        return labelService.GenerateZpl(parcel);
    }

    private static string FormatAddress(LastMile.TMS.Domain.Entities.Address address)
    {
        var parts = new List<string> { address.Street1 };
        if (!string.IsNullOrWhiteSpace(address.Street2)) parts.Add(address.Street2);
        parts.Add($"{address.City}, {address.State} {address.PostalCode}");
        parts.Add(address.CountryCode);
        return string.Join(", ", parts);
    }
}
