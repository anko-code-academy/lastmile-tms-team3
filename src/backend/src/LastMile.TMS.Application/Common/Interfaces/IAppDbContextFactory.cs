namespace LastMile.TMS.Application.Common.Interfaces;

public interface IAppDbContextFactory
{
    IAppDbContext CreateDbContext();
}
