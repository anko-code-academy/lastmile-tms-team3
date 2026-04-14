using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class InboundManifestSortInput : SortInputType<InboundManifest>
{
    protected override void Configure(ISortInputTypeDescriptor<InboundManifest> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.ManifestNumber);
        descriptor.Field(x => x.Status);
    }
}
