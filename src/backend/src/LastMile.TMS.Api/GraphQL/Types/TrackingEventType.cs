using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class TrackingEventType : ObjectType<TrackingEvent>
{
    protected override void Configure(IObjectTypeDescriptor<TrackingEvent> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Timestamp);
        descriptor.Field(x => x.EventType);
        descriptor.Field(x => x.Description);
        descriptor.Field(x => x.LocationCity);
        descriptor.Field(x => x.LocationState);
        descriptor.Field(x => x.LocationCountryCode);
        descriptor.Field(x => x.Operator);
        descriptor.Field(x => x.DelayReason);
        descriptor.Field(x => x.CreatedAt);
    }
}
