using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Depots.DTOs;

namespace LastMile.TMS.Api.GraphQL.Types;

public class DepotType : ObjectType<DepotDto>
{
    protected override void Configure(IObjectTypeDescriptor<DepotDto> descriptor)
    {
        descriptor.Name("Depot");

        descriptor.Field(d => d.Id).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Address).Type<NonNullType<AddressType>>();
        descriptor.Field(d => d.IsActive).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.OperatingHours).Type<NonNullType<OperatingHoursType>>();
        descriptor.Field(d => d.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(d => d.LastModifiedAt).Type<DateTimeType>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}
