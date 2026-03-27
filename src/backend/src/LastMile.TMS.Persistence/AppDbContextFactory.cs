using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Persistence;

public class AppDbContextFactory : IAppDbContextFactory
{
    private readonly IDbContextFactory<AppDbContext> _factory;

    public AppDbContextFactory(IDbContextFactory<AppDbContext> factory)
    {
        _factory = factory;
    }

    public IAppDbContext CreateDbContext() => _factory.CreateDbContext();
}
