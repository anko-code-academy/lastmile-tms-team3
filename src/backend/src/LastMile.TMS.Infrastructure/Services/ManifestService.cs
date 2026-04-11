using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LastMile.TMS.Infrastructure.Services;

public class ManifestService : IManifestService
{
    public byte[] GenerateManifest(DeliveryRoute route)
    {
        var parcels = route.Parcels.ToList();
        var loadedCount = parcels.Count(p => p.Status == ParcelStatus.Loaded);
        var totalWeight = parcels.Sum(p => p.Weight);
        var totalItems = parcels.Count;

        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(9));

                page.Header().Column(col =>
                {
                    col.Item().Text("LAST MILE TMS — ROUTE MANIFEST").Bold().FontSize(16);
                    col.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                });

                page.Content().PaddingTop(12).Column(col =>
                {
                    // Route info
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(t => { t.Span("Route: ").Bold(); t.Span(route.Name); });
                            c.Item().Text(t => { t.Span("Date: ").Bold(); t.Span(route.Date.ToString("yyyy-MM-dd")); });
                            c.Item().Text(t => { t.Span("Status: ").Bold(); t.Span(route.Status.ToString().ToUpper()); });
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(t => { t.Span("Depot: ").Bold(); t.Span(route.Depot?.Name ?? "—"); });
                            c.Item().Text(t =>
                            {
                                t.Span("Driver: ").Bold();
                                t.Span(route.Driver != null
                                    ? $"{route.Driver.FirstName} {route.Driver.LastName}"
                                    : "—");
                            });
                            c.Item().Text(t => { t.Span("Zone: ").Bold(); t.Span(route.Zone?.Name ?? "—"); });
                        });
                    });

                    // Summary
                    col.Item().PaddingTop(10).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);
                    col.Item().PaddingTop(6).Row(row =>
                    {
                        row.RelativeItem().Text(t =>
                        {
                            t.Span("Parcels: ").Bold();
                            t.Span($"{loadedCount}/{parcels.Count} loaded");
                        });
                        row.RelativeItem().Text(t =>
                        {
                            t.Span("Total weight: ").Bold();
                            t.Span($"{totalWeight:F1} kg");
                        });
                        row.RelativeItem().Text(t =>
                        {
                            t.Span("Items: ").Bold();
                            t.Span($"{totalItems}");
                        });
                    });
                    col.Item().PaddingTop(6).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                    // Parcel table header
                    col.Item().PaddingTop(8).Row(row =>
                    {
                        row.ConstantItem(25).Text("#").Bold().FontSize(8);
                        row.ConstantItem(110).Text("Tracking").Bold().FontSize(8);
                        row.ConstantItem(130).Text("Recipient").Bold().FontSize(8);
                        row.ConstantItem(60).Text("Weight").Bold().FontSize(8);
                        row.ConstantItem(40).Text("Items").Bold().FontSize(8);
                        row.ConstantItem(50).Text("Service").Bold().FontSize(8);
                        row.ConstantItem(60).Text("Status").Bold().FontSize(8);
                        row.RelativeItem().Text("Delivered").Bold().FontSize(8).AlignCenter();
                    });
                    col.Item().PaddingTop(2).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

                    // Parcel rows
                    for (var i = 0; i < parcels.Count; i++)
                    {
                        var parcel = parcels[i];
                        var recipientCity = parcel.RecipientAddress?.City ?? "—";
                        var recipientState = parcel.RecipientAddress?.State ?? "";

                        col.Item().PaddingTop(4).Row(row =>
                        {
                            row.ConstantItem(25).Text($"{i + 1}").FontSize(8);
                            row.ConstantItem(110).Text(parcel.TrackingNumber).FontSize(8);
                            row.ConstantItem(130)
                                .Text($"{recipientCity}, {recipientState}".TrimEnd(',')).FontSize(8);
                            row.ConstantItem(60).Text($"{parcel.Weight:F1} {parcel.WeightUnit.ToString().ToLower()}").FontSize(8);
                            row.ConstantItem(40).Text("-").FontSize(8);
                            row.ConstantItem(50).Text(parcel.ServiceType.ToString().ToUpper()).FontSize(8);
                            row.ConstantItem(60)
                                .Text(parcel.Status.ToString().ToUpper())
                                .FontSize(8);
                            row.RelativeItem().Text("☐").FontSize(12).AlignCenter();
                        });
                    }

                    // Footer
                    col.Item().PaddingTop(20).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                    col.Item().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(t =>
                            {
                                t.Span("Loaded at: ").Bold();
                                t.Span(route.LoadedAt?.ToString("yyyy-MM-dd HH:mm") ?? "—");
                            });
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Signature: ___________________________").Bold();
                        });
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }
}
