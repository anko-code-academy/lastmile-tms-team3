using HotChocolate.Authorization;
using HotChocolate.Data;
using HotChocolate.Types;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using LastMile.TMS.Persistence.Identity;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Api.GraphQL.Queries;

[ExtendObjectType(OperationTypeNames.Query)]
public class UserQuery
{
    // [Authorize(Policy = "Admin")]
    [UseProjection]
    public IQueryable<AppUser> GetUsers(
        AppDbContext context,
        string? search = null,
        UserRole? role = null)
    {
        var query = context.Users.AsNoTracking();

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.FirstName.Contains(search) ||
                u.LastName.Contains(search) ||
                u.Email.Contains(search));

        return query;
    }
}
