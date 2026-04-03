using HotChocolate.Data.Filters;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public class ParcelFilterInput : FilterInputType<Parcel>
{
    protected override void Configure(IFilterInputTypeDescriptor<Parcel> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.ZoneId);
        descriptor.Field(x => x.ParcelType);
        descriptor.Field(x => x.CreatedAt);
    }
}