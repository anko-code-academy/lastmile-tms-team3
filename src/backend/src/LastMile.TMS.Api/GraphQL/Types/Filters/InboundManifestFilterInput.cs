using HotChocolate.Data.Filters;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public class InboundManifestFilterInput : FilterInputType<InboundManifest>
{
    protected override void Configure(IFilterInputTypeDescriptor<InboundManifest> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.DepotId);
        descriptor.Field(x => x.ManifestNumber);
    }
}
