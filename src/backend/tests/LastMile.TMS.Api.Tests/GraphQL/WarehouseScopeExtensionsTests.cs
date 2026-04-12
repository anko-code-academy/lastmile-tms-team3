using FluentAssertions;
using LastMile.TMS.Api.GraphQL.Queries;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using NSubstitute;

namespace LastMile.TMS.Api.Tests.GraphQL;

public class WarehouseScopeExtensionsTests
{
    [Fact]
    public void ApplyWarehouseScope_InboundManifest_DepotOperator_WithDepot_FiltersToAssignedDepot()
    {
        var depotId = Guid.NewGuid();
        var currentUser = CreateCurrentUser("DepotOperator", depotId);

        var manifests = new List<InboundManifest>
        {
            new() { Id = Guid.NewGuid(), DepotId = depotId, ManifestNumber = "MF-001" },
            new() { Id = Guid.NewGuid(), DepotId = Guid.NewGuid(), ManifestNumber = "MF-002" },
        }.AsQueryable();

        var result = manifests.ApplyWarehouseScope(currentUser).ToList();

        result.Should().HaveCount(1);
        result[0].ManifestNumber.Should().Be("MF-001");
    }

    [Fact]
    public void ApplyWarehouseScope_InboundManifest_DepotOperator_WithoutDepot_ReturnsEmpty()
    {
        var currentUser = CreateCurrentUser("DepotOperator", depotId: null);

        var manifests = new List<InboundManifest>
        {
            new() { Id = Guid.NewGuid(), DepotId = Guid.NewGuid(), ManifestNumber = "MF-001" },
        }.AsQueryable();

        var result = manifests.ApplyWarehouseScope(currentUser).ToList();

        result.Should().BeEmpty();
    }

    [Fact]
    public void ApplyWarehouseScope_InboundManifest_Admin_ReturnsAll()
    {
        var currentUser = CreateCurrentUser("Admin", depotId: null);

        var manifests = new List<InboundManifest>
        {
            new() { Id = Guid.NewGuid(), DepotId = Guid.NewGuid(), ManifestNumber = "MF-001" },
            new() { Id = Guid.NewGuid(), DepotId = Guid.NewGuid(), ManifestNumber = "MF-002" },
            new() { Id = Guid.NewGuid(), DepotId = Guid.NewGuid(), ManifestNumber = "MF-003" },
        }.AsQueryable();

        var result = manifests.ApplyWarehouseScope(currentUser).ToList();

        result.Should().HaveCount(3);
    }

    private static ICurrentUserService CreateCurrentUser(string role, Guid? depotId)
    {
        var currentUser = Substitute.For<ICurrentUserService>();
        currentUser.IsInRole(role).Returns(true);
        currentUser.AssignedDepotId.Returns(depotId);
        return currentUser;
    }
}
