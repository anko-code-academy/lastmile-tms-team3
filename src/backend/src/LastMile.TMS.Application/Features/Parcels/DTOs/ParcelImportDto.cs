using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.Parcels.DTOs;

public record ParcelImportPreviewDto(
    Guid ImportId,
    string FileName,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    List<ParcelImportRowDto> Rows
);

public record ParcelImportRowDto(
    int RowNumber,
    bool IsValid,
    List<string> Errors
);

public record ParcelImportConfirmDto(
    Guid ImportId,
    bool ImportValidRowsOnly = true
);

public record ParcelImportResultDto(
    Guid ImportId,
    string FileName,
    ImportStatus Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int ParcelsCreated,
    List<string> CreatedParcelTrackingNumbers,
    List<ParcelImportRowDto> Errors
);

public record ImportHistoryDto(
    Guid Id,
    string FileName,
    ImportFileType FileType,
    ImportStatus Status,
    int TotalRows,
    int ValidRows,
    int InvalidRows,
    int ParcelsCreated,
    DateTimeOffset CreatedAt
);