using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class DeliveryConfirmationType : ObjectType<DeliveryConfirmation>
{
    protected override void Configure(IObjectTypeDescriptor<DeliveryConfirmation> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.ReceivedBy);
        descriptor.Field(x => x.DeliveryLocation)
            .Name("location");
        descriptor.Field(x => x.SignatureImage);
        descriptor.Field(x => x.Photo);
        descriptor.Field(x => x.DeliveredAt);
        descriptor.Field(x => x.DeliveryGeoLocation)
            .Name("geoLocation")
            .Type<StringType>()
            .Resolve(ctx =>
            {
                var confirmation = ctx.Parent<DeliveryConfirmation>();
                return confirmation.DeliveryGeoLocation?.AsText();
            });
    }
}
