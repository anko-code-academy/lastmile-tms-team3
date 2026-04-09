using System.Text;
using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Enums;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Services;

public class ParcelImportCsvErrorTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;

    public ParcelImportCsvErrorTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
    }

    [Fact]
    public async Task ParseAndValidateAsync_WithMalformedRows_StillParsesValidRows()
    {
        // Arrange - CSV with 3 rows: 2 valid, 1 with bad data (non-numeric weight)
        var csv = """
            RecipientContactName,RecipientCompanyName,RecipientStreet1,RecipientStreet2,RecipientCity,RecipientState,RecipientPostalCode,RecipientCountryCode,RecipientPhone,RecipientEmail,RecipientIsResidential,ShipperContactName,ShipperCompanyName,ShipperStreet1,ShipperStreet2,ShipperCity,ShipperState,ShipperPostalCode,ShipperCountryCode,ShipperPhone,ShipperEmail,ShipperIsResidential,Weight,WeightUnit,Length,Width,Height,DimensionUnit,DeclaredValue,Currency,ServiceType,ParcelType,Description,Notes
            John Doe,,123 Main St,,Nashville,TN,37211,US,,,false,Jane Smith,,456 Ship St,,Louisville,KY,40201,US,,,false,5.5,LB,10,8,6,IN,25.99,USD,STANDARD,,Test parcel,
            Bob Jones,,789 Oak Ave,,Memphis,TN,38101,US,,,false,Alice Brown,,101 Ship Blvd,,Nashville,TN,37201,US,,,false,NOT_A_NUMBER,LB,10,8,6,IN,50,USD,EXPRESS,,Bad weight row,
            Carol White,,222 Elm St,,Knoxville,TN,37901,US,,,false,Dave Green,,333 Ship Ln,,Chattanooga,TN,37401,US,,,false,3.2,LB,12,6,4,IN,15,USD,ECONOMY,,Valid third row,
            """;

        var stream = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var service = CreateService();

        // Act
        var result = await service.ParseAndValidateAsync(stream, "test.csv", ImportFileType.Csv);

        // Assert - all 3 rows should be parsed, with the bad one marked invalid
        result.TotalRows.Should().Be(3);
        result.Rows.Should().HaveCount(3);
    }

    [Fact]
    public async Task ParseAndValidateAsync_WithCompletelyGarbledRow_DoesNotCrash()
    {
        // Arrange - CSV where row 2 has shifted columns (missing a field)
        var csv = """
            RecipientContactName,RecipientCompanyName,RecipientStreet1,RecipientStreet2,RecipientCity,RecipientState,RecipientPostalCode,RecipientCountryCode,RecipientPhone,RecipientEmail,RecipientIsResidential,ShipperContactName,ShipperCompanyName,ShipperStreet1,ShipperStreet2,ShipperCity,ShipperState,ShipperPostalCode,ShipperCountryCode,ShipperPhone,ShipperEmail,ShipperIsResidential,Weight,WeightUnit,Length,Width,Height,DimensionUnit,DeclaredValue,Currency,ServiceType,ParcelType,Description,Notes
            John Doe,,123 Main St,,Nashville,TN,37211,US,,,false,Jane Smith,,456 Ship St,,Louisville,KY,40201,US,,,false,5.5,LB,10,8,6,IN,25.99,USD,STANDARD,,Test,
            only_three_fields,here,whoops
            Carol White,,222 Elm St,,Knoxville,TN,37901,US,,,false,Dave Green,,333 Ship Ln,,Chattanooga,TN,37401,US,,,false,3.2,LB,12,6,4,IN,15,USD,ECONOMY,,Valid,
            """;

        var stream = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var service = CreateService();

        // Act
        var result = await service.ParseAndValidateAsync(stream, "test.csv", ImportFileType.Csv);

        // Assert - should parse 3 rows total (2 valid + 1 error), not crash
        result.TotalRows.Should().Be(3);
    }

    private ParcelImportService CreateService()
    {
        var logger = Substitute.For<ILogger<ParcelImportService>>();
        return new ParcelImportService(
            _context,
            _currentUser,
            new StubGeocodingService(),
            new StubZoneMatchingService(),
            new NullImportProgressNotifier(),
            logger);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

file class StubGeocodingService : IGeocodingService
{
    public Task<GeocodingResult?> GeocodeAsync(
        string street, string city, string state, string postalCode, string countryCode,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<GeocodingResult?>(new GeocodingResult(40.7128, -71.0589));
    }
}

file class StubZoneMatchingService : IZoneMatchingService
{
    public Task<Guid?> FindMatchingZoneIdAsync(double latitude, double longitude, CancellationToken cancellationToken = default)
        => Task.FromResult<Guid?>(null);

    public Task<Guid?> FindMatchingZoneIdAsync(NetTopologySuite.Geometries.Point point, CancellationToken cancellationToken = default)
        => Task.FromResult<Guid?>(null);
}
