using FluentAssertions;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LastMile.TMS.Api.Tests.Persistence;

public class SeederIntegrationTests(ApiWebApplicationFactory factory)
    : IClassFixture<ApiWebApplicationFactory>
{
    private static readonly ParcelStatus[] DashboardStatuses =
    [
        ParcelStatus.ReceivedAtDepot,
        ParcelStatus.Sorted,
        ParcelStatus.Staged,
        ParcelStatus.Loaded,
        ParcelStatus.Exception,
    ];

    [Fact]
    public async Task Seeder_Should_Create_Mixed_Status_Parcels_With_Partial_Staged_Route_Assignment()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var parcels = await db.Parcels
            .Include(parcel => parcel.Zone)
            .ToListAsync();
        var routes = await db.DeliveryRoutes.ToListAsync();

        parcels.Should().NotBeEmpty();
        routes.Should().NotBeEmpty();

        parcels.Select(parcel => parcel.Status)
            .Should()
            .Contain(DashboardStatuses);

        var stagedParcels = parcels.Where(parcel => parcel.Status == ParcelStatus.Staged).ToList();
        stagedParcels.Should().NotBeEmpty();
        stagedParcels.Should().Contain(parcel => parcel.RouteId.HasValue);
        stagedParcels.Should().Contain(parcel => !parcel.RouteId.HasValue);

        var now = DateTimeOffset.UtcNow;
        foreach (var thresholdHours in new[] { 24, 48, 72 })
        {
            parcels.Should().Contain(parcel =>
                DashboardStatuses.Contains(parcel.Status) &&
                parcel.CurrentStatusChangedAt <= now.AddHours(-thresholdHours));
        }

        var fortyEightHourThreshold = now.AddHours(-48);
        var depotSummaries = parcels
            .Where(parcel => parcel.Zone is not null)
            .GroupBy(parcel => parcel.Zone!.DepotId)
            .Select(group => new
            {
                DepotId = group.Key,
                DashboardCount = group.Count(parcel => DashboardStatuses.Contains(parcel.Status)),
                AlertedCount = group.Count(parcel =>
                    DashboardStatuses.Contains(parcel.Status) &&
                    parcel.CurrentStatusChangedAt <= fortyEightHourThreshold),
            })
            .ToList();

        depotSummaries.Should().HaveCountGreaterThan(1);
        depotSummaries.Select(summary => summary.DashboardCount).Distinct().Count().Should().BeGreaterThan(1);
        depotSummaries.Select(summary => summary.AlertedCount).Distinct().Count().Should().BeGreaterThan(1);
    }
}