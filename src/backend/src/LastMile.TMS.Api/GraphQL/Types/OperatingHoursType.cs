using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class OperatingHoursType : ObjectType<OperatingHours>
{
    protected override void Configure(IObjectTypeDescriptor<OperatingHours> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Schedule);
        descriptor.Field(x => x.DaysOff);
    }
}

public class DailyAvailabilityType : ObjectType<DailyAvailability>
{
    protected override void Configure(IObjectTypeDescriptor<DailyAvailability> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.DayOfWeek);
        descriptor.Field(x => x.StartTime);
        descriptor.Field(x => x.EndTime);
    }
}

public class DayOffType : ObjectType<DayOff>
{
    protected override void Configure(IObjectTypeDescriptor<DayOff> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Date);
        descriptor.Field(x => x.IsPaid);
        descriptor.Field(x => x.Reason);
    }
}
