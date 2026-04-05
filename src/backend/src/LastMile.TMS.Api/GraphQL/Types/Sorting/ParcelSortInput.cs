using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class ParcelSortInput : SortInputType<Parcel>
{
    protected override void Configure(ISortInputTypeDescriptor<Parcel> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.TrackingNumber);
        descriptor.Field(x => x.Status);
    }
}