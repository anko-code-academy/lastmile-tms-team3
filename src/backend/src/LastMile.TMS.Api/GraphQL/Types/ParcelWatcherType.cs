using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class ParcelWatcherType : ObjectType<ParcelWatcher>
{
    protected override void Configure(IObjectTypeDescriptor<ParcelWatcher> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Email);
        descriptor.Field(x => x.Name);
    }
}
