using HotChocolate.Data.Sorting;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Sorting;

public class AuditLogSortInput : SortInputType<AuditLog>
{
    protected override void Configure(ISortInputTypeDescriptor<AuditLog> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.OccurredAt);
        descriptor.Field(x => x.ActionType);
        descriptor.Field(x => x.ResourceType);
        descriptor.Field(x => x.ActorUserName);
    }
}
