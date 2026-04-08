using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Infrastructure.Services;
using Microsoft.Extensions.Logging;
using NSubstitute;
using QuestPDF.Infrastructure;

namespace LastMile.TMS.Application.Tests.Labels;

public class LabelServiceTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly LabelService _labelService;

    public LabelServiceTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        _context = TestAppDbContext.Create<LabelServiceTests>();
        var logger = Substitute.For<ILogger<LabelService>>();
        _labelService = new LabelService(logger);
    }

    private Parcel CreateTestParcel()
    {
        var recipientAddressId = Guid.NewGuid();
        var shipperAddressId = Guid.NewGuid();
        var zoneId = Guid.NewGuid();

        var recipientAddress = new Address
        {
            Id = recipientAddressId,
            Street1 = "456 Main St",
            Street2 = "Apt 3",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            IsResidential = true,
            ContactName = "John Smith",
            CompanyName = "Acme Corp",
            Phone = "615-555-0100",
            Email = "john@example.com"
        };

        var shipperAddress = new Address
        {
            Id = shipperAddressId,
            Street1 = "123 Sender Ave",
            City = "Memphis",
            State = "TN",
            PostalCode = "38103",
            CountryCode = "US",
            IsResidential = false,
            ContactName = "Jane Doe",
            CompanyName = "Sender LLC"
        };

        var zone = new Zone
        {
            Id = zoneId,
            Name = "Zone A1",
            IsActive = true,
            Boundary = null
        };

        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "LMT-20260407-TESTAB",
            BarcodeData = "LMT-20260407-TESTAB",
            Description = "Test package",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddressId,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddressId,
            ShipperAddress = shipperAddress,
            Weight = 2.5m,
            WeightUnit = WeightUnit.Kg,
            Length = 30m,
            Width = 20m,
            Height = 15m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 150m,
            Currency = "USD",
            ParcelType = "Standard",
            Notes = "Handle with care",
            ZoneId = zoneId,
            Zone = zone,
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        return parcel;
    }

    [Fact]
    public void GenerateZpl_WithValidParcel_ReturnsZplString()
    {
        // Arrange
        var parcel = CreateTestParcel();

        // Act
        var zpl = _labelService.GenerateZpl(parcel);

        // Assert
        zpl.Should().NotBeNullOrEmpty();
        zpl.Should().Contain("^XA");
        zpl.Should().Contain("^XZ");
        zpl.Should().Contain(parcel.TrackingNumber);
        zpl.Should().Contain("John Smith");
        zpl.Should().Contain("Nashville");
        zpl.Should().Contain("37201");
        zpl.Should().Contain("Zone A1");
        zpl.Should().Contain("Standard");
        zpl.Should().Contain("EXPRESS");
        // ZPL barcode command
        zpl.Should().Contain("^BCN"); // Code 128 barcode
        // ZPL QR code command
        zpl.Should().Contain("^BQN"); // QR code
    }

    [Fact]
    public void GenerateZpl_WithNullBarcodeData_UsesTrackingNumber()
    {
        // Arrange
        var parcel = CreateTestParcel();
        parcel.BarcodeData = null;

        // Act
        var zpl = _labelService.GenerateZpl(parcel);

        // Assert
        zpl.Should().Contain(parcel.TrackingNumber);
    }

    [Fact]
    public void GenerateZpl_WithNullZoneName_ShowsDash()
    {
        // Arrange
        var parcel = CreateTestParcel();
        parcel.Zone = null;
        parcel.ZoneId = null;

        // Act
        var zpl = _labelService.GenerateZpl(parcel);

        // Assert
        zpl.Should().Contain("ZONE:");
        zpl.Should().Contain("—"); // em dash for null zone
    }

    [Fact]
    public void GenerateZpl_WithNullParcelType_ShowsDash()
    {
        // Arrange
        var parcel = CreateTestParcel();
        parcel.ParcelType = null;

        // Act
        var zpl = _labelService.GenerateZpl(parcel);

        // Assert
        zpl.Should().Contain("TYPE:"); // still has TYPE field
    }

    [Fact]
    public void GeneratePdf_WithValidParcel_ReturnsPdfBytes()
    {
        // Arrange
        var parcel = CreateTestParcel();

        // Act
        var pdf = _labelService.GeneratePdf(parcel);

        // Assert
        pdf.Should().NotBeNullOrEmpty();
        // PDF files start with %PDF
        var pdfHeader = System.Text.Encoding.ASCII.GetString(pdf.Take(4).ToArray());
        pdfHeader.Should().Be("%PDF");
    }

    [Fact]
    public void GenerateBulkPdf_WithMultipleParcels_ReturnsCombinedPdf()
    {
        // Arrange
        var parcel1 = CreateTestParcel();
        var parcel2 = CreateTestParcel();
        parcel2.TrackingNumber = "LMT-20260407-TESTCD";
        parcel2.BarcodeData = "LMT-20260407-TESTCD";
        var parcels = new[] { parcel1, parcel2 };

        // Act
        var pdf = _labelService.GenerateBulkPdf(parcels);

        // Assert
        pdf.Should().NotBeNullOrEmpty();
        var pdfHeader = System.Text.Encoding.ASCII.GetString(pdf.Take(4).ToArray());
        pdfHeader.Should().Be("%PDF");
    }

    [Fact]
    public void GenerateBulkPdf_WithEmptyList_ReturnsEmptyArray()
    {
        // Arrange
        var parcels = new List<Parcel>();

        // Act
        var pdf = _labelService.GenerateBulkPdf(parcels);

        // Assert
        pdf.Should().BeEmpty();
    }

    [Fact]
    public void GenerateBulkPdf_WithSingleParcel_ReturnsSinglePagePdf()
    {
        // Arrange
        var parcel = CreateTestParcel();
        var parcels = new[] { parcel };

        // Act
        var pdf = _labelService.GenerateBulkPdf(parcels);

        // Assert
        pdf.Should().NotBeNullOrEmpty();
        var pdfHeader = System.Text.Encoding.ASCII.GetString(pdf.Take(4).ToArray());
        pdfHeader.Should().Be("%PDF");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
