using HotChocolate.Data.Filters;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public class DeliveryRouteFilterInput : FilterInputType<DeliveryRoute>
{
    protected override void Configure(IFilterInputTypeDescriptor<DeliveryRoute> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.Date);
        descriptor.Field(x => x.DepotId);
        descriptor.Field(x => x.DriverId);
        descriptor.Field(x => x.ZoneId);
        descriptor.Field(x => x.VehicleId);
    }
}
