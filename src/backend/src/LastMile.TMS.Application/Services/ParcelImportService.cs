using FluentValidation;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Application.Services;

public class ParcelImportService : IParcelImportService
{
    private readonly IAppDbContextFactory _contextFactory;
    private readonly ICurrentUserService _currentUser;
    private readonly IGeocodingService _geocodingService;
    private readonly IZoneMatchingService _zoneMatchingService;
    private readonly IImportProgressNotifier _notifier;
    private readonly RowValidator _validator;

    public ParcelImportService(
        IAppDbContextFactory contextFactory,
        ICurrentUserService currentUser,
        IGeocodingService geocodingService,
        IZoneMatchingService zoneMatchingService,
        IImportProgressNotifier notifier)
    {
        _contextFactory = contextFactory;
        _currentUser = currentUser;
        _geocodingService = geocodingService;
        _zoneMatchingService = zoneMatchingService;
        _notifier = notifier;
        _validator = new RowValidator();
    }

    public async Task<ParcelImportPreviewDto> ParseAndValidateAsync(
        Stream fileStream,
        string fileName,
        ImportFileType fileType,
        CancellationToken cancellationToken = default)
    {
        var fileSize = fileStream.Length;
        var rows = await ParseFileAsync(fileStream, fileName, fileType, cancellationToken);
        var validatedRows = new List<ParcelImportRowDto>();
        var validCount = 0;
        var invalidCount = 0;

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var dto = row.ToCreateParcelDto();
            var result = await _validator.ValidateAsync(dto, cancellationToken);

            if (result.IsValid)
            {
                validCount++;
                validatedRows.Add(new ParcelImportRowDto(i + 1, true, new List<string>()));
            }
            else
            {
                invalidCount++;
                validatedRows.Add(new ParcelImportRowDto(
                    i + 1,
                    false,
                    result.Errors.Select(e => e.ErrorMessage).ToList()));
            }
        }

        var importId = Guid.NewGuid();
        var preview = new ParcelImportPreviewDto(
            ImportId: importId,
            FileName: fileName,
            TotalRows: rows.Count,
            ValidRows: validCount,
            InvalidRows: invalidCount,
            Rows: validatedRows
        );

        await StoreImportHistoryAsync(importId, fileName, fileType, fileSize, preview, rows, cancellationToken);

        return preview;
    }

    public async Task<ParcelImportResultDto> ExecuteImportAsync(
        Guid importId,
        CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();
        var import = await context.ParcelImportHistories.FindAsync(new object[] { importId }, cancellationToken)
            ?? throw new InvalidOperationException($"Import {importId} not found");

        if (import.Status != ImportStatus.PreviewGenerated)
            throw new InvalidOperationException($"Import {importId} is not in PreviewGenerated state");

        import.Status = ImportStatus.Processing;
        await context.SaveChangesAsync(cancellationToken);

        var rows = System.Text.Json.JsonSerializer.Deserialize<List<ParcelImportRow>>(
            import.PreviewData ?? "[]",
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (rows == null)
            throw new InvalidOperationException("Failed to deserialize row data");

        var createdTrackingNumbers = new List<string>();
        var errors = new List<ParcelImportRowDto>();
        var now = DateTimeOffset.UtcNow;

        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            try
            {
                var dto = row.ToCreateParcelDto();
                var validationResult = await _validator.ValidateAsync(dto, cancellationToken);
                if (!validationResult.IsValid)
                {
                    errors.Add(new ParcelImportRowDto(
                        row.RowNumber,
                        false,
                        validationResult.Errors.Select(e => e.ErrorMessage).ToList()));
                    continue;
                }

                // Create parcel
                var recipientGeo = await GeocodeAsync(row.RecipientStreet1, row.RecipientCity, row.RecipientState, row.RecipientPostalCode, row.RecipientCountryCode, cancellationToken);
                var shipperGeo = await GeocodeAsync(row.ShipperStreet1, row.ShipperCity, row.ShipperState, row.ShipperPostalCode, row.ShipperCountryCode, cancellationToken);

                var recipientAddress = new Address
                {
                    Id = Guid.NewGuid(),
                    Street1 = row.RecipientStreet1,
                    Street2 = row.RecipientStreet2,
                    City = row.RecipientCity,
                    State = row.RecipientState,
                    PostalCode = row.RecipientPostalCode,
                    CountryCode = row.RecipientCountryCode,
                    IsResidential = row.RecipientIsResidential,
                    ContactName = row.RecipientContactName,
                    CompanyName = row.RecipientCompanyName,
                    Phone = row.RecipientPhone,
                    Email = row.RecipientEmail,
                    GeoLocation = recipientGeo,
                    CreatedAt = now,
                    CreatedBy = _currentUser.UserId
                };

                var shipperAddress = new Address
                {
                    Id = Guid.NewGuid(),
                    Street1 = row.ShipperStreet1,
                    Street2 = row.ShipperStreet2,
                    City = row.ShipperCity,
                    State = row.ShipperState,
                    PostalCode = row.ShipperPostalCode,
                    CountryCode = row.ShipperCountryCode,
                    IsResidential = row.ShipperIsResidential,
                    ContactName = row.ShipperContactName,
                    CompanyName = row.ShipperCompanyName,
                    Phone = row.ShipperPhone,
                    Email = row.ShipperEmail,
                    GeoLocation = shipperGeo,
                    CreatedAt = now,
                    CreatedBy = _currentUser.UserId
                };

                var trackingNumber = $"LMT-{now:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
                Guid? zoneId = null;
                if (recipientGeo != null)
                {
                    zoneId = await _zoneMatchingService.FindMatchingZoneIdAsync(recipientGeo, cancellationToken);
                }

                var parcel = new Parcel
                {
                    Id = Guid.NewGuid(),
                    TrackingNumber = trackingNumber,
                    BarcodeData = trackingNumber,
                    Description = row.Description,
                    ServiceType = ParseServiceType(row.ServiceType),
                    Status = ParcelStatus.Registered,
                    RecipientAddressId = recipientAddress.Id,
                    RecipientAddress = recipientAddress,
                    ShipperAddressId = shipperAddress.Id,
                    ShipperAddress = shipperAddress,
                    Weight = row.Weight,
                    WeightUnit = ParseWeightUnit(row.WeightUnit),
                    Length = row.Length,
                    Width = row.Width,
                    Height = row.Height,
                    DimensionUnit = ParseDimensionUnit(row.DimensionUnit),
                    DeclaredValue = row.DeclaredValue,
                    Currency = row.Currency,
                    ParcelType = row.ParcelType,
                    Notes = row.Notes,
                    ZoneId = zoneId,
                    DeliveryAttempts = 0,
                    CreatedAt = now,
                    CreatedBy = _currentUser.UserId
                };

                context.Parcels.Add(parcel);
                createdTrackingNumbers.Add(trackingNumber);
            }
            catch (Exception ex)
            {
                errors.Add(new ParcelImportRowDto(row.RowNumber, false, new List<string> { ex.Message }));
            }

            await _notifier.NotifyProgressAsync(
                importId,
                i + 1,
                rows.Count,
                createdTrackingNumbers.Count > 0 ? createdTrackingNumbers[^1] : "",
                createdTrackingNumbers.Count,
                cancellationToken);
        }

        await context.SaveChangesAsync(cancellationToken);

        import.Status = ImportStatus.Completed;
        import.ParcelsCreated = createdTrackingNumbers.Count;
        import.SetRowErrors(errors.Select(e => new ParcelImportRowError
        {
            RowNumber = e.RowNumber,
            ErrorMessage = string.Join("; ", e.Errors)
        }).ToList());
        await context.SaveChangesAsync(cancellationToken);

        await _notifier.NotifyCompletedAsync(
            importId,
            rows.Count,
            createdTrackingNumbers.Count,
            cancellationToken);

        return new ParcelImportResultDto(
            ImportId: importId,
            FileName: import.FileName,
            Status: ImportStatus.Completed,
            TotalRows: import.TotalRows,
            ValidRows: import.ValidRows,
            InvalidRows: import.InvalidRows,
            ParcelsCreated: createdTrackingNumbers.Count,
            CreatedParcelTrackingNumbers: createdTrackingNumbers,
            Errors: errors
        );
    }

    public async Task<ParcelImportResultDto?> GetImportResultAsync(
        Guid importId,
        CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();
        var import = await context.ParcelImportHistories.FindAsync(new object[] { importId }, cancellationToken);

        if (import == null) return null;

        return new ParcelImportResultDto(
            ImportId: import.Id,
            FileName: import.FileName,
            Status: import.Status,
            TotalRows: import.TotalRows,
            ValidRows: import.ValidRows,
            InvalidRows: import.InvalidRows,
            ParcelsCreated: import.ParcelsCreated,
            CreatedParcelTrackingNumbers: new List<string>(),
            Errors: import.GetRowErrors().Select(e => new ParcelImportRowDto(e.RowNumber, false, new List<string> { e.ErrorMessage })).ToList()
        );
    }

    public async Task<IReadOnlyList<ImportHistoryDto>> GetImportHistoryAsync(
        CancellationToken cancellationToken = default)
    {
        using var context = _contextFactory.CreateDbContext();
        return await context.ParcelImportHistories
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .Select(x => new ImportHistoryDto(
                x.Id,
                x.FileName,
                x.FileType,
                x.Status,
                x.TotalRows,
                x.ValidRows,
                x.InvalidRows,
                x.ParcelsCreated,
                x.CreatedAt
            ))
            .ToListAsync(cancellationToken);
    }

    private async Task<List<ParcelImportRow>> ParseFileAsync(
        Stream fileStream,
        string fileName,
        ImportFileType fileType,
        CancellationToken cancellationToken)
    {
        var rows = new List<ParcelImportRow>();

        if (fileType == ImportFileType.Csv)
        {
            using var reader = new StreamReader(fileStream);
            var config = new CsvHelper.Configuration.CsvConfiguration(System.Globalization.CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            };
            using var csv = new CsvHelper.CsvReader(reader, config);
            csv.Context.RegisterClassMap<ParcelImportCsvMap>();

            // Read header first so CsvHelper.Context.Parser.Row gives correct row numbers
            await csv.ReadAsync();
            csv.ReadHeader();

            var rowNum = 1; // header is row 1
            while (await csv.ReadAsync())
            {
                rowNum++;
                try
                {
                    var record = csv.GetRecord<ParcelImportRow>();
                    if (record != null)
                    {
                        record.RowNumber = rowNum;
                        rows.Add(record);
                    }
                }
                catch (CsvHelper.CsvHelperException)
                {
                    // Row has structural issues (wrong column count, type conversion failure, etc.)
                    // Add a minimal row so validation marks it invalid with meaningful errors
                    rows.Add(new ParcelImportRow { RowNumber = rowNum });
                }
            }
        }
        else
        {
            using var workbook = new ClosedXML.Excel.XLWorkbook(fileStream);
            var worksheet = workbook.Worksheets.First();
            var headers = worksheet.Row(1).Cells().Select(c => c.GetString()).ToList();

            for (var i = 2; i <= worksheet.LastRowUsed().RowNumber(); i++)
            {
                var rowData = new Dictionary<string, string>();
                for (var j = 0; j < headers.Count; j++)
                {
                    rowData[headers[j]] = worksheet.Cell(i, j + 1).GetString();
                }
                rows.Add(MapRowFromExcel(rowData, i + 1));
            }
        }

        return rows;
    }

    private static ParcelImportRow MapRowFromExcel(Dictionary<string, string> row, int rowNumber)
    {
        return new ParcelImportRow
        {
            RowNumber = rowNumber,
            RecipientContactName = row.GetValueOrDefault("RecipientContactName", ""),
            RecipientCompanyName = row.GetValueOrDefault("RecipientCompanyName"),
            RecipientStreet1 = row.GetValueOrDefault("RecipientStreet1", ""),
            RecipientStreet2 = row.GetValueOrDefault("RecipientStreet2"),
            RecipientCity = row.GetValueOrDefault("RecipientCity", ""),
            RecipientState = row.GetValueOrDefault("RecipientState", ""),
            RecipientPostalCode = row.GetValueOrDefault("RecipientPostalCode", ""),
            RecipientCountryCode = row.GetValueOrDefault("RecipientCountryCode", "US"),
            RecipientPhone = row.GetValueOrDefault("RecipientPhone"),
            RecipientEmail = row.GetValueOrDefault("RecipientEmail"),
            RecipientIsResidential = ParseBool(row.GetValueOrDefault("RecipientIsResidential", "false")),
            ShipperContactName = row.GetValueOrDefault("ShipperContactName", ""),
            ShipperCompanyName = row.GetValueOrDefault("ShipperCompanyName"),
            ShipperStreet1 = row.GetValueOrDefault("ShipperStreet1", ""),
            ShipperStreet2 = row.GetValueOrDefault("ShipperStreet2"),
            ShipperCity = row.GetValueOrDefault("ShipperCity", ""),
            ShipperState = row.GetValueOrDefault("ShipperState", ""),
            ShipperPostalCode = row.GetValueOrDefault("ShipperPostalCode", ""),
            ShipperCountryCode = row.GetValueOrDefault("ShipperCountryCode", "US"),
            ShipperPhone = row.GetValueOrDefault("ShipperPhone"),
            ShipperEmail = row.GetValueOrDefault("ShipperEmail"),
            ShipperIsResidential = ParseBool(row.GetValueOrDefault("ShipperIsResidential", "false")),
            Weight = decimal.TryParse(row.GetValueOrDefault("Weight", "0"), out var w) ? w : 0,
            WeightUnit = row.GetValueOrDefault("WeightUnit", "LB"),
            Length = decimal.TryParse(row.GetValueOrDefault("Length", "0"), out var l) ? l : 0,
            Width = decimal.TryParse(row.GetValueOrDefault("Width", "0"), out var wd) ? wd : 0,
            Height = decimal.TryParse(row.GetValueOrDefault("Height", "0"), out var h) ? h : 0,
            DimensionUnit = row.GetValueOrDefault("DimensionUnit", "IN"),
            DeclaredValue = decimal.TryParse(row.GetValueOrDefault("DeclaredValue", "0"), out var dv) ? dv : 0,
            Currency = row.GetValueOrDefault("Currency", "USD"),
            ServiceType = row.GetValueOrDefault("ServiceType", "STANDARD"),
            ParcelType = row.GetValueOrDefault("ParcelType"),
            Description = row.GetValueOrDefault("Description"),
            Notes = row.GetValueOrDefault("Notes")
        };
    }

    private static bool ParseBool(string value)
    {
        return value.Equals("true", StringComparison.OrdinalIgnoreCase) ||
               value.Equals("1", StringComparison.OrdinalIgnoreCase) ||
               value.Equals("yes", StringComparison.OrdinalIgnoreCase);
    }

    private static ServiceType ParseServiceType(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "ECONOMY" => ServiceType.Economy,
            "STANDARD" => ServiceType.Standard,
            "EXPRESS" => ServiceType.Express,
            "OVERNIGHT" => ServiceType.Overnight,
            _ => ServiceType.Standard
        };
    }

    private static WeightUnit ParseWeightUnit(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "KG" => WeightUnit.Kg,
            "LB" => WeightUnit.Lb,
            _ => WeightUnit.Lb
        };
    }

    private static DimensionUnit ParseDimensionUnit(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "CM" => DimensionUnit.Cm,
            "IN" => DimensionUnit.In,
            _ => DimensionUnit.In
        };
    }

    private async Task<NetTopologySuite.Geometries.Point?> GeocodeAsync(
        string street, string city, string state, string postalCode, string countryCode,
        CancellationToken cancellationToken)
    {
        var result = await _geocodingService.GeocodeAsync(street, city, state, postalCode, countryCode, cancellationToken);
        if (result == null) return null;
        return new NetTopologySuite.Geometries.Point(result.Longitude, result.Latitude) { SRID = 4326 };
    }

    private async Task StoreImportHistoryAsync(
        Guid importId,
        string fileName,
        ImportFileType fileType,
        long fileSize,
        ParcelImportPreviewDto preview,
        List<ParcelImportRow> rows,
        CancellationToken cancellationToken)
    {
        using var context = _contextFactory.CreateDbContext();
        var history = new ParcelImportHistory
        {
            Id = importId,
            FileName = fileName,
            FileType = fileType,
            FileSizeBytes = fileSize,
            TotalRows = preview.TotalRows,
            ValidRows = preview.ValidRows,
            InvalidRows = preview.InvalidRows,
            Status = ImportStatus.PreviewGenerated,
            PreviewData = System.Text.Json.JsonSerializer.Serialize(rows),
            CreatedBy = _currentUser.UserId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        context.ParcelImportHistories.Add(history);
        await context.SaveChangesAsync(cancellationToken);
    }
}

public class RowValidator : AbstractValidator<CreateParcelDto>
{
    public RowValidator()
    {
        RuleFor(x => x.RecipientAddress).NotNull().WithMessage("Recipient address is required");
        RuleFor(x => x.ShipperAddress).NotNull().WithMessage("Shipper address is required");
        RuleFor(x => x.Weight).GreaterThan(0).WithMessage("Weight must be greater than 0");
        RuleFor(x => x.Length).GreaterThan(0).WithMessage("Length must be greater than 0");
        RuleFor(x => x.Width).GreaterThan(0).WithMessage("Width must be greater than 0");
        RuleFor(x => x.Height).GreaterThan(0).WithMessage("Height must be greater than 0");
        RuleFor(x => x.DeclaredValue).GreaterThanOrEqualTo(0).WithMessage("Declared value cannot be negative");
        RuleFor(x => x.Notes).MaximumLength(500).WithMessage("Notes cannot exceed 500 characters");
    }
}