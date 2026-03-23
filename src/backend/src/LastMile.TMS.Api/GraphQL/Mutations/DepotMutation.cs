using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Depots.Commands;
using LastMile.TMS.Application.Features.Depots.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
[Authorize(Roles = "Admin,OperationsManager")]
public class DepotMutation
{
    public async Task<DepotDto> CreateDepot(
        [Service] IMediator mediator,
        CreateDepotDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateDepot.Command(input), cancellationToken);
    }

    public async Task<DepotDto> UpdateDepot(
        [Service] IMediator mediator,
        UpdateDepotDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new UpdateDepot.Command(input), cancellationToken);
    }

    public async Task<bool> DeleteDepot(
        [Service] IMediator mediator,
        [ID] Guid id,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new DeleteDepot.Command(id), cancellationToken);
    }
}

// GraphQL input type descriptors — map GraphQL inputs to the existing DTOs
public class CreateDepotInput : InputObjectType<CreateDepotDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<CreateDepotDto> descriptor)
    {
        descriptor.Name("CreateDepotInput");
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Address).Type<NonNullType<CreateAddressInput>>();
        descriptor.Field(d => d.IsActive).Type<BooleanType>().DefaultValue(true);
        descriptor.Field(d => d.OperatingHours).Type<OperatingHoursInput>();
    }
}

public class UpdateDepotInput : InputObjectType<UpdateDepotDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<UpdateDepotDto> descriptor)
    {
        descriptor.Name("UpdateDepotInput");
        descriptor.Field(d => d.Id).Type<NonNullType<IdType>>();
        descriptor.Field(d => d.Name).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Address).Type<NonNullType<CreateAddressInput>>();
        descriptor.Field(d => d.IsActive).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.OperatingHours).Type<OperatingHoursInput>();
    }
}

public class CreateAddressInput : InputObjectType<CreateAddressDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<CreateAddressDto> descriptor)
    {
        descriptor.Name("CreateAddressInput");
        descriptor.Field(d => d.Street1).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.Street2).Type<StringType>();
        descriptor.Field(d => d.City).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.State).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.PostalCode).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.CountryCode).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.IsResidential).Type<BooleanType>().DefaultValue(false);
        descriptor.Field(d => d.ContactName).Type<StringType>();
        descriptor.Field(d => d.CompanyName).Type<StringType>();
        descriptor.Field(d => d.Phone).Type<StringType>();
        descriptor.Field(d => d.Email).Type<StringType>();
        descriptor.Field(d => d.Latitude).Type<FloatType>();
        descriptor.Field(d => d.Longitude).Type<FloatType>();
    }
}

public class OperatingHoursInput : InputObjectType<OperatingHoursDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<OperatingHoursDto> descriptor)
    {
        descriptor.Name("OperatingHoursInput");
        descriptor.Field(d => d.Schedule).Type<NonNullType<ListType<NonNullType<DailyAvailabilityInput>>>>();
        descriptor.Field(d => d.DaysOff).Type<NonNullType<ListType<NonNullType<DayOffInput>>>>();
    }
}

public class DailyAvailabilityInput : InputObjectType<DailyAvailabilityDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<DailyAvailabilityDto> descriptor)
    {
        descriptor.Name("DailyAvailabilityInput");
        descriptor.Field(d => d.DayOfWeek).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.StartTime).Type<StringType>();
        descriptor.Field(d => d.EndTime).Type<StringType>();
    }
}

public class DayOffInput : InputObjectType<DayOffDto>
{
    protected override void Configure(IInputObjectTypeDescriptor<DayOffDto> descriptor)
    {
        descriptor.Name("DayOffInput");
        descriptor.Field(d => d.Date).Type<NonNullType<DateType>>();
        descriptor.Field(d => d.IsPaid).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.Reason).Type<StringType>();
    }
}
