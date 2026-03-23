using LastMile.TMS.Application.Features.Depots.DTOs;

namespace LastMile.TMS.Api.GraphQL.Types;

public class OperatingHoursType : ObjectType<OperatingHoursDto>
{
    protected override void Configure(IObjectTypeDescriptor<OperatingHoursDto> descriptor)
    {
        descriptor.Name("OperatingHours");

        descriptor.Field(d => d.Schedule).Type<NonNullType<ListType<NonNullType<DailyAvailabilityType>>>>();
        descriptor.Field(d => d.DaysOff).Type<NonNullType<ListType<NonNullType<DayOffType>>>>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}

public class DailyAvailabilityType : ObjectType<DailyAvailabilityDto>
{
    protected override void Configure(IObjectTypeDescriptor<DailyAvailabilityDto> descriptor)
    {
        descriptor.Name("DailyAvailability");

        descriptor.Field(d => d.DayOfWeek).Type<NonNullType<StringType>>();
        descriptor.Field(d => d.StartTime).Type<StringType>();
        descriptor.Field(d => d.EndTime).Type<StringType>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}

public class DayOffType : ObjectType<DayOffDto>
{
    protected override void Configure(IObjectTypeDescriptor<DayOffDto> descriptor)
    {
        descriptor.Name("DayOff");

        descriptor.Field(d => d.Date).Type<NonNullType<DateType>>();
        descriptor.Field(d => d.IsPaid).Type<NonNullType<BooleanType>>();
        descriptor.Field(d => d.Reason).Type<StringType>();

        descriptor.BindFields(BindingBehavior.Implicit);
    }
}
