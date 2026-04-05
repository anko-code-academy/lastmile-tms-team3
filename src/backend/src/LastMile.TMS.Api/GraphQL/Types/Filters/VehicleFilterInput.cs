using HotChocolate.Data.Filters;
using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public class VehicleFilterInput : FilterInputType<Vehicle>
{
    protected override void Configure(IFilterInputTypeDescriptor<Vehicle> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.RegistrationPlate);
        descriptor.Field(x => x.Type);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.DepotId);
    }
}
