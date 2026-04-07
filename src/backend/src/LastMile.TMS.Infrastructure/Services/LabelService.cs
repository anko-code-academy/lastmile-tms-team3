using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SkiaSharp;

namespace LastMile.TMS.Infrastructure.Services;

public class LabelService : ILabelService
{
    private readonly ILogger<LabelService> _logger;

    public LabelService(ILogger<LabelService> logger)
    {
        _logger = logger;
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public string GenerateZpl(Parcel parcel)
    {
        var qrData = parcel.BarcodeData ?? parcel.TrackingNumber;
        var recipient = parcel.RecipientAddress;
        var shipper = parcel.ShipperAddress;
        var recipientName = !string.IsNullOrWhiteSpace(recipient.ContactName)
            ? recipient.ContactName
            : recipient.CompanyName ?? "";
        var shipperName = !string.IsNullOrWhiteSpace(shipper.ContactName)
            ? shipper.ContactName
            : shipper.CompanyName ?? "";
        var recipientAddress = FormatAddress(recipient);
        var shipperAddress = FormatAddress(shipper);
        var zoneName = parcel.Zone?.Name ?? "—";

        // ZPL for 4x6 label (203 DPI: 812 dots wide, 1216 dots tall)
        return $@"^XA
^FO50,30^BQN,2,8^FDQA,{qrData}^FS
^FO350,30^A0N,40,40^FD{parcel.TrackingNumber}^FS
^FO350,80^A0N,28,28^FD{parcel.ServiceType.ToString().ToUpper()}^FS
^FO350,115^GB0,900,3^FS
^FO50,140^A0N,28,28^FDTO:^FS
^FO50,175^A0N,32,32^FD{recipientName}^FS
^FO50,215^A0N,28,28^FD{recipientAddress}^FS
^FO50,280^GB0,550,3^FS
^FO50,290^A0N,28,28^FDFROM:^FS
^FO50,325^A0N,32,32^FD{shipperName}^FS
^FO50,365^A0N,28,28^FD{shipperAddress}^FS
^FO700,290^A0N,28,28^FDZONE:^FS
^FO700,325^A0N,40,40^FD{zoneName}^FS
^FO700,400^A0N,28,28^FDTYPE:^FS
^FO700,435^A0N,32,32^FD{parcel.ParcelType ?? "—"}^FS
^FO50,840^GB0,300,3^FS
^FO50,850^A0N,28,28^FD{parcel.ParcelType ?? "—"}^FS
^FO50,885^BY3^BCN,80,Y,N,N^FD{parcel.TrackingNumber}^FS
^XZ";
    }

    public byte[] GeneratePdf(Parcel parcel)
    {
        var parcels = new[] { parcel };
        return GenerateBulkPdf(parcels);
    }

    public byte[] GenerateBulkPdf(IEnumerable<Parcel> parcelsList)
    {
        var parcels = parcelsList.ToList();
        if (parcels.Count == 0)
            return Array.Empty<byte>();

        var doc = Document.Create(container =>
        {
            foreach (var parcel in parcels)
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10));

                    ComposePage(page, parcel);
                });
            }
        });

        return doc.GeneratePdf();
    }

    public byte[] GenerateQrCode(string data)
    {
        // Using ZXing.Net for QR code generation
        var writer = new ZXing.QrCode.QRCodeWriter();
        var bitMatrix = writer.encode(data, ZXing.BarcodeFormat.QR_CODE, 200, 200);
        var bytes = new byte[200 * 200 * 4];
        var white = (byte)255;
        var black = (byte)0;

        for (var y = 0; y < 200; y++)
        {
            for (var x = 0; x < 200; x++)
            {
                var idx = (y * 200 + x) * 4;
                var bit = bitMatrix[y, x];
                var color = bit ? black : white;
                bytes[idx] = color;     // B
                bytes[idx + 1] = color; // G
                bytes[idx + 2] = color; // R
                bytes[idx + 3] = 255;   // A
            }
        }

        return bytes;
    }

    private static string FormatAddress(Address address)
    {
        var parts = new List<string> { address.Street1 };
        if (!string.IsNullOrWhiteSpace(address.Street2)) parts.Add(address.Street2);
        parts.Add($"{address.City}, {address.State} {address.PostalCode}");
        parts.Add(address.CountryCode);
        return string.Join("\n", parts);
    }

    private void ComposePage(PageDescriptor page, Parcel parcel)
    {
        var qrData = parcel.BarcodeData ?? parcel.TrackingNumber;
        var recipient = parcel.RecipientAddress;
        var shipper = parcel.ShipperAddress;
        var recipientName = !string.IsNullOrWhiteSpace(recipient.ContactName)
            ? recipient.ContactName
            : recipient.CompanyName ?? "";
        var shipperName = !string.IsNullOrWhiteSpace(shipper.ContactName)
            ? shipper.ContactName
            : shipper.CompanyName ?? "";
        var recipientAddress = FormatAddress(recipient);
        var shipperAddress = FormatAddress(shipper);
        var zoneName = parcel.Zone?.Name ?? "—";

        page.Header().Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text($"TRACKING: {parcel.TrackingNumber}").Bold().FontSize(16);
                    c.Item().PaddingTop(4).Text($"SERVICE: {parcel.ServiceType.ToString().ToUpper()}").FontSize(12);
                });
                row.ConstantItem(120).AlignRight().Column(c =>
                {
                    c.Item().Text($"{DateTimeOffset.UtcNow:yyyy-MM-dd}").FontSize(10);
                });
            });
            col.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Medium);
        });

        page.Content().PaddingTop(20).Column(col =>
        {
            col.Item().Row(row =>
            {
                // Left: QR code
                row.ConstantItem(150).Column(c =>
                {
                    c.Item().DefaultTextStyle(x => x.FontSize(8));
                    var writer = new ZXing.QrCode.QRCodeWriter();
                    var bitMatrix = writer.encode(qrData, ZXing.BarcodeFormat.QR_CODE, 150, 150);
                    var imageData = BitMatrixToImage(bitMatrix);
                    c.Item().Image(imageData).FitWidth();
                    c.Item().PaddingTop(4).AlignCenter().Text($"{parcel.TrackingNumber}").FontSize(8);
                });

                // Right: addresses and info
                row.RelativeItem().PaddingLeft(25).Column(c =>
                {
                    // TO section
                    c.Item().Text("TO:").Bold().FontSize(13);
                    c.Item().PaddingTop(4).Text(recipientName).FontSize(11);
                    c.Item().Text(recipientAddress).FontSize(10);

                    c.Item().PaddingTop(25).Text("FROM:").Bold().FontSize(13);
                    c.Item().PaddingTop(4).Text(shipperName).FontSize(11);
                    c.Item().Text(shipperAddress).FontSize(10);

                    c.Item().PaddingTop(25).Row(r =>
                    {
                        r.RelativeItem().Text($"ZONE: {zoneName}").Bold().FontSize(12);
                        r.ConstantItem(150).AlignRight().Text($"TYPE: {parcel.ParcelType ?? "—"}").FontSize(12);
                    });
                });
            });

            // Barcode at bottom
            col.Item().PaddingTop(40).AlignCenter().Column(c =>
            {
                c.Item().Text($"PARCEL TYPE: {parcel.ParcelType ?? "—"}").Bold().FontSize(10);
                c.Item().PaddingTop(10).Text($"TRACKING: {parcel.TrackingNumber}").FontSize(9);
            });
        });
    }

    private static byte[] BitMatrixToImage(ZXing.Common.BitMatrix matrix)
    {
        var width = matrix.Width;
        var height = matrix.Height;
        using var bitmap = new SKBitmap(width, height);
        using var canvas = new SKCanvas(bitmap);

        var white = new SKColor(255, 255, 255, 255);
        var black = new SKColor(0, 0, 0, 255);

        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var bit = matrix[y, x];
                var color = bit ? black : white;
                canvas.DrawPoint(x, y, color);
            }
        }

        using var image = bitmap.Encode(SKEncodedImageFormat.Png, 100);
        return image.ToArray();
    }
}
