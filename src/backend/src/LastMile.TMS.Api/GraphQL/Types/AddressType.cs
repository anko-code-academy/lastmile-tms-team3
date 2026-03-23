using LastMile.TMS.Application.Features.Depots.DTOs;

namespace LastMile.TMS.Api.GraphQL.Types;

public class AddressType : ObjectType<AddressDto>
{
    protected override void Configure(IObjectTypeDescriptor<AddressDto> descriptor)
    {
        descriptor.Name("Address");

        descriptor.Field(d => d.Street1).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Street2).Type<StringType>();
        descriptor.Field(d => d.City).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.State).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.PostalCode).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.CountryCode).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.IsResidential).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.ContactName).Type<StringType>();
        descriptor.Field(d => d.CompanyName).Type<StringType>();
        descriptor.Field(d => d.Phone).Type<StringType>();
        descriptor.Field(d => d.Email).Type<StringType>();
        descriptor.Field(d => d.Latitude).Type<FloatType>();
        descriptor.Field(d => d.Longitude).Type<FloatType>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}
