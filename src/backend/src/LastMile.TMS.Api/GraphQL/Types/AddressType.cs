using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class AddressType : ObjectType<Address>
{
    protected override void Configure(IObjectTypeDescriptor<Address> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Street1);
        descriptor.Field(x => x.Street2);
        descriptor.Field(x => x.City);
        descriptor.Field(x => x.State);
        descriptor.Field(x => x.PostalCode);
        descriptor.Field(x => x.CountryCode);
        descriptor.Field(x => x.IsResidential);
        descriptor.Field(x => x.ContactName);
        descriptor.Field(x => x.CompanyName);
        descriptor.Field(x => x.Phone);
        descriptor.Field(x => x.Email);
        descriptor.Field(x => x.GeoLocation)
            .Type<StringType>()
            .Resolve(ctx =>
            {
                var address = ctx.Parent<Address>();
                return address.GeoLocation?.AsText();
            });
        descriptor.Field(x => x.CreatedAt);
        descriptor.Field(x => x.LastModifiedAt);
    }
}
