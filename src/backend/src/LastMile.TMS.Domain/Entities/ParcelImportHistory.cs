using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Domain.Entities;

public class ParcelImportHistory : BaseAuditableEntity
{
    public new Guid Id { get; set; } = Guid.NewGuid();
    public string FileName { get; set; } = string.Empty;
    public ImportFileType FileType { get; set; }
    public long FileSizeBytes { get; set; }
    public int TotalRows { get; set; }
    public int ValidRows { get; set; }
    public int InvalidRows { get; set; }
    public int ParcelsCreated { get; set; }
    public ImportStatus Status { get; set; }
    public string? CorrelationId { get; set; }
    public List<ParcelImportRowError> RowErrors { get; set; } = new();
    public string? PreviewData { get; set; }
}

public class ParcelImportRowError
{
    public int RowNumber { get; set; }
    public string Field { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}