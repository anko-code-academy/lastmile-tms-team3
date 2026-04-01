using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class ZoneType : ObjectType<Zone>
{
    protected override void Configure(IObjectTypeDescriptor<Zone> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(z => z.Id);
        descriptor.Field(z => z.Name);
        descriptor.Field(z => z.Boundary)
            .IsProjected(true)
            .Type<StringType>()
            .Resolve(ctx =>
            {
                var zone = ctx.Parent<Zone>();
                return zone.Boundary?.AsText();
            });
        descriptor.Field(z => z.IsActive);
        descriptor.Field(z => z.DepotId).IsProjected(true);
        descriptor.Field(z => z.Depot).Type<DepotType>();
        descriptor.Field(z => z.CreatedAt);
        descriptor.Field(z => z.LastModifiedAt);
    }
}
