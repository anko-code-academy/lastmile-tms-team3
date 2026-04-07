using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Services;

public interface IParcelImportService
{
    Task<ParcelImportPreviewDto> ParseAndValidateAsync(
        Stream fileStream,
        string fileName,
        ImportFileType fileType,
        CancellationToken cancellationToken = default);

    Task<ParcelImportResultDto> ExecuteImportAsync(
        Guid importId,
        CancellationToken cancellationToken = default);

    Task<ParcelImportResultDto?> GetImportResultAsync(
        Guid importId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ImportHistoryDto>> GetImportHistoryAsync(
        CancellationToken cancellationToken = default);
}