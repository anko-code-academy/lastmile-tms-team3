using HotChocolate.Data.Filters;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public class DriverFilterInput : FilterInputType<Driver>
{
    protected override void Configure(IFilterInputTypeDescriptor<Driver> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.IsActive);
        descriptor.Field(x => x.DepotId);
    }
}