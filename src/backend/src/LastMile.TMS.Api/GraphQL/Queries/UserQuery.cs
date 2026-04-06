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
    [Authorize(Policy = "Admin")]
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
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(term) ||
                u.LastName.ToLower().Contains(term) ||
                u.Email!.ToLower().Contains(term));
        }

        return query.OrderBy(u => u.LastName).ThenBy(u => u.FirstName);
    }
}
