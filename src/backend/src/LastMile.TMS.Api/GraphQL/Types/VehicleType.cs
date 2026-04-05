using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class VehicleType : ObjectType<Vehicle>
{
    protected override void Configure(IObjectTypeDescriptor<Vehicle> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.RegistrationPlate);
        descriptor.Field(x => x.Type);
        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.ParcelCapacity);
        descriptor.Field(x => x.WeightCapacity);
        descriptor.Field(x => x.WeightUnit);
        descriptor.Field(x => x.DepotId);
        descriptor.Field(x => x.Depot).Type<DepotType>();
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
    }
}
