namespace LastMile.TMS.Application.Common.Interfaces;

public interface IDbSeeder
{
    Task SeedAsync(CancellationToken cancellationToken = default);
}
