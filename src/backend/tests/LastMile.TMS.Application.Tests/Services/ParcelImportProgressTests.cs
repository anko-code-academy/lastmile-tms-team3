using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace LastMile.TMS.Application.Tests.Services;

public class ParcelImportProgressTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly FakeCurrentUserService _currentUser;
    private readonly IImportProgressNotifier _notifier;

    public ParcelImportProgressTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
        _notifier = Substitute.For<IImportProgressNotifier>();
    }

    [Fact]
    public async Task ExecuteImportAsync_NotifiesProgressForEachRow()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var rows = CreateValidImportRows(3);
        await SeedImportHistoryAsync(importId, rows);

        var service = CreateService();

        // Act
        await service.ExecuteImportAsync(importId);

        // Assert - NotifyProgressAsync called once per row
        await _notifier.Received(3).NotifyProgressAsync(
            importId,
            Arg.Any<int>(),
            3,
            Arg.Any<string>(),
            Arg.Any<int>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteImportAsync_NotifiesProgressWithCorrectRowNumbers()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var rows = CreateValidImportRows(2);
        await SeedImportHistoryAsync(importId, rows);

        var service = CreateService();

        // Act
        await service.ExecuteImportAsync(importId);

        // Assert - row numbers are 1-based
        await _notifier.Received(1).NotifyProgressAsync(
            importId, 1, 2, Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
        await _notifier.Received(1).NotifyProgressAsync(
            importId, 2, 2, Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteImportAsync_NotifiesCompletedAfterAllRows()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var rows = CreateValidImportRows(2);
        await SeedImportHistoryAsync(importId, rows);

        var service = CreateService();

        // Act
        await service.ExecuteImportAsync(importId);

        // Assert
        await _notifier.Received(1).NotifyCompletedAsync(
            importId, 2, 2, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteImportAsync_WithNullNotifier_StillCompletesSuccessfully()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var rows = CreateValidImportRows(1);
        await SeedImportHistoryAsync(importId, rows);

        var nullNotifier = new NullImportProgressNotifier();
        var service = CreateService(nullNotifier);

        // Act
        var result = await service.ExecuteImportAsync(importId);

        // Assert
        result.Should().NotBeNull();
        result.ParcelsCreated.Should().Be(1);
    }

    private ParcelImportService CreateService(IImportProgressNotifier? notifier = null)
    {
        var logger = Substitute.For<ILogger<ParcelImportService>>();
        return new ParcelImportService(
            _context, _currentUser, new StubGeocodingService(), new StubZoneMatchingService(), notifier ?? _notifier, logger);
    }

    private static List<ParcelImportRow> CreateValidImportRows(int count)
    {
        var rows = new List<ParcelImportRow>();
        for (var i = 0; i < count; i++)
        {
            rows.Add(new ParcelImportRow
            {
                RowNumber = i + 2,
                RecipientContactName = $"Recipient {i}",
                RecipientStreet1 = $"{100 + i} Main St",
                RecipientCity = "Nashville",
                RecipientState = "TN",
                RecipientPostalCode = "37211",
                RecipientCountryCode = "US",
                ShipperContactName = $"Shipper {i}",
                ShipperStreet1 = $"{200 + i} Warehouse Dr",
                ShipperCity = "Louisville",
                ShipperState = "KY",
                ShipperPostalCode = "40201",
                ShipperCountryCode = "US",
                Weight = 5.5m + i,
                WeightUnit = "LB",
                Length = 10,
                Width = 8,
                Height = 6,
                DimensionUnit = "IN",
                DeclaredValue = 25.99m,
                Currency = "USD",
                ServiceType = "STANDARD"
            });
        }
        return rows;
    }

    private async Task SeedImportHistoryAsync(Guid importId, List<ParcelImportRow> rows)
    {
        var history = new ParcelImportHistory
        {
            Id = importId,
            FileName = "test-import.csv",
            FileType = ImportFileType.Csv,
            FileSizeBytes = 1024,
            TotalRows = rows.Count,
            ValidRows = rows.Count,
            InvalidRows = 0,
            Status = ImportStatus.PreviewGenerated,
            PreviewData = System.Text.Json.JsonSerializer.Serialize(rows),
            CreatedBy = "test-user-id",
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.ParcelImportHistories.Add(history);
        await _context.SaveChangesAsync();
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
