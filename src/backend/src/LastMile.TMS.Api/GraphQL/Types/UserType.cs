using HotChocolate.Types;
using LastMile.TMS.Persistence.Identity;

namespace LastMile.TMS.Api.GraphQL.Types;

public class UserType : ObjectType<AppUser>
{
    protected override void Configure(IObjectTypeDescriptor<AppUser> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(u => u.Id);
        descriptor.Field(u => u.FirstName);
        descriptor.Field(u => u.LastName);
        descriptor.Field("fullName")
            .Resolve(ctx =>
            {
                var user = ctx.Parent<AppUser>();
                return user.FullName;
            });
        descriptor.Field(u => u.Email);
        descriptor.Field(u => u.Phone);
        descriptor.Field(u => u.Role);
        descriptor.Field(u => u.AssignedDepotId);
        descriptor.Field(u => u.IsActive);
        descriptor.Field(u => u.CreatedAt);
        descriptor.Field(u => u.LastModifiedAt).Name("updatedAt");
    }
}
