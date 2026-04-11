using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class DeliveryRouteSortInput : SortInputType<DeliveryRoute>
{
    protected override void Configure(ISortInputTypeDescriptor<DeliveryRoute> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Name);
        descriptor.Field(x => x.Date);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.CreatedAt);
    }
}
