using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class AuditLogType : ObjectType<AuditLog>
{
    protected override void Configure(IObjectTypeDescriptor<AuditLog> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.OccurredAt);
        descriptor.Field(x => x.ActorUserId);
        descriptor.Field(x => x.ActorUserName);
        descriptor.Field(x => x.ActionType);
        descriptor.Field(x => x.ResourceType);
        descriptor.Field(x => x.ResourceId);
        descriptor.Field(x => x.CorrelationId);
        descriptor.Field(x => x.Summary);
        descriptor.Field(x => x.BeforeValuesJson);
        descriptor.Field(x => x.AfterValuesJson);
    }
}