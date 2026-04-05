using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class VehicleSortInput : SortInputType<Vehicle>
{
    protected override void Configure(ISortInputTypeDescriptor<Vehicle> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.RegistrationPlate);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.Type);
    }
}