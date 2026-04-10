using HotChocolate.Types;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Api.GraphQL.Types;

public sealed record DepotParcelDashboard(
    IReadOnlyList<ParcelStatusCountItem> StatusCounts,
    IReadOnlyList<DepotZoneParcelSummary> ZoneBreakdown,
    ParcelAgingAlerts AgingAlerts,
    DateTimeOffset LastUpdatedAt);

public sealed record ParcelStatusCountItem(ParcelStatus Status, int Count);

public sealed record DepotZoneParcelSummary(
    Guid ZoneId,
    string ZoneName,
    int Count,
    IReadOnlyList<ParcelStatusCountItem> StatusCounts,
    IReadOnlyList<ParcelStatusCountItem> AgingStatusCounts);

public sealed record ParcelAgingAlerts(
    int TotalCount,
    IReadOnlyList<ParcelStatusCountItem> StatusCounts);

public class DepotParcelDashboardType : ObjectType<DepotParcelDashboard>
{
    protected override void Configure(IObjectTypeDescriptor<DepotParcelDashboard> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.StatusCounts).Type<NonNullType<ListType<NonNullType<ParcelStatusCountItemType>>>>();
        descriptor.Field(x => x.ZoneBreakdown).Type<NonNullType<ListType<NonNullType<DepotZoneParcelSummaryType>>>>();
        descriptor.Field(x => x.AgingAlerts).Type<NonNullType<ParcelAgingAlertsType>>();
        descriptor.Field(x => x.LastUpdatedAt);
    }
}

public class ParcelStatusCountItemType : ObjectType<ParcelStatusCountItem>
{
    protected override void Configure(IObjectTypeDescriptor<ParcelStatusCountItem> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Status);
        descriptor.Field(x => x.Count);
    }
}

public class DepotZoneParcelSummaryType : ObjectType<DepotZoneParcelSummary>
{
    protected override void Configure(IObjectTypeDescriptor<DepotZoneParcelSummary> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.ZoneId);
        descriptor.Field(x => x.ZoneName);
        descriptor.Field(x => x.Count);
        descriptor.Field(x => x.StatusCounts)
            .Type<NonNullType<ListType<NonNullType<ParcelStatusCountItemType>>>>();
        descriptor.Field(x => x.AgingStatusCounts)
            .Type<NonNullType<ListType<NonNullType<ParcelStatusCountItemType>>>>();
    }
}

public class ParcelAgingAlertsType : ObjectType<ParcelAgingAlerts>
{
    protected override void Configure(IObjectTypeDescriptor<ParcelAgingAlerts> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.TotalCount);
        descriptor.Field(x => x.StatusCounts)
            .Type<NonNullType<ListType<NonNullType<ParcelStatusCountItemType>>>>();
    }
}