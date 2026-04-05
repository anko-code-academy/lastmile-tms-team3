using HotChocolate.Data.Filters;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types.Filters;

public sealed class AuditLogFilterInput : FilterInputType<AuditLog>
{
    protected override void Configure(IFilterInputTypeDescriptor<AuditLog> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.ActionType);
        descriptor.Field(x => x.ResourceType);
        descriptor.Field(x => x.ResourceId);
        descriptor.Field(x => x.OccurredAt);
    }
}
