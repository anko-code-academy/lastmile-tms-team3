namespace LastMile.TMS.Application.Services;

public interface IWarehouseCodeGenerator
{
    Task<string> GenerateAisleCodeAsync(Guid zoneId, CancellationToken cancellationToken = default);
    Task<string> GenerateBinCodeAsync(Guid aisleId, CancellationToken cancellationToken = default);
    string GenerateBinLabelCode(Guid zoneId, string aisleCode, string binCode);
}