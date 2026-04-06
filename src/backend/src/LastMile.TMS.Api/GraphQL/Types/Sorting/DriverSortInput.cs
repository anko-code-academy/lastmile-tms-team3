using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class DriverSortInput : SortInputType<Driver>
{
    protected override void Configure(ISortInputTypeDescriptor<Driver> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.FirstName);
        descriptor.Field(x => x.LastName);
        descriptor.Field(x => x.Email);
        descriptor.Field(x => x.LicenseNumber);
    }
}