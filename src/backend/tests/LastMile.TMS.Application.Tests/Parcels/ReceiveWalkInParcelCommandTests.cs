using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Tests.Parcels;

public class ReceiveWalkInParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly ReceiveWalkInParcel.Handler _handler;

    private readonly Guid _addressId = Guid.NewGuid();
    private readonly Guid _depotId = Guid.NewGuid();

    public ReceiveWalkInParcelCommandTests()
    {
        _context = TestAppDbContext.Create<ReceiveWalkInParcelCommandTests>();
        _handler = new ReceiveWalkInParcel.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var address = new Address
        {
            Id = _addressId,
            Street1 = "123 Main St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Parcel NOT in any manifest (true walk-in)
        var walkInParcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "WALKIN-TEST-001",
            ServiceType = ServiceType.Express,
            Status = ParcelStatus.Registered,
            RecipientAddressId = _addressId,
            ShipperAddressId = _addressId,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10, Width = 10, Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 10,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Parcel IN a manifest
        var manifestParcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "WALKIN-MANIFESTED-001",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = _addressId,
            ShipperAddressId = _addressId,
            Weight = 2.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10, Width = 10, Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 20,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var manifest = new InboundManifest
        {
            Id = Guid.NewGuid(),
            ManifestNumber = "MFT-WALKIN-001",
            DepotId = _depotId,
            Status = InboundManifestStatus.Sealed,
            MaxParcels = 10,
            CreatedAt = DateTimeOffset.UtcNow
        };
        manifest.Parcels.Add(manifestParcel);

        _context.Depots.Add(depot);
        _context.Addresses.Add(address);
        _context.Parcels.AddRange(walkInParcel, manifestParcel);
        _context.InboundManifests.Add(manifest);
        _context.SaveChanges();
    }

    [Fact]
    public async Task ReceiveWalkInParcel_TransitionsToReceivedAtDepot()
    {
        var dto = new ReceiveWalkInParcelDto("WALKIN-TEST-001", null, null, null, null, null);
        var result = await _handler.Handle(new ReceiveWalkInParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot.ToString());
        result.TrackingNumber.Should().Be("WALKIN-TEST-001");
        result.IsMisdirected.Should().BeFalse();
    }

    [Fact]
    public async Task ReceiveWalkInParcel_ParcelNotFound_Throws()
    {
        var dto = new ReceiveWalkInParcelDto("NONEXISTENT-001", null, null, null, null, null);
        var act = () => _handler.Handle(new ReceiveWalkInParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    [Fact]
    public async Task ReceiveWalkInParcel_WrongStatus_Throws()
    {
        // Receive the parcel first
        var receiveDto = new ReceiveWalkInParcelDto("WALKIN-TEST-001", null, null, null, null, null);
        await _handler.Handle(new ReceiveWalkInParcel.Command(receiveDto), CancellationToken.None);

        // Try receiving again
        var act = () => _handler.Handle(new ReceiveWalkInParcel.Command(receiveDto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*expected 'Registered'*");
    }

    [Fact]
    public async Task ReceiveWalkInParcel_WithDockDoor_Succeeds()
    {
        var dto = new ReceiveWalkInParcelDto("WALKIN-TEST-001", "Dock 3", null, null, null, null);
        var result = await _handler.Handle(new ReceiveWalkInParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot.ToString());
    }

    [Fact]
    public async Task ReceiveWalkInParcel_ParcelInManifest_FlaggedAsMisdirectedException()
    {
        var dto = new ReceiveWalkInParcelDto("WALKIN-MANIFESTED-001", null, null, null, null, null);
        var result = await _handler.Handle(new ReceiveWalkInParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Exception.ToString());
        result.IsMisdirected.Should().BeTrue();
    }

    [Fact]
    public async Task ReceiveWalkInParcel_ParcelInClosedManifest_ReceivedNormally()
    {
        // Close the manifest
        using var ctx = (TestAppDbContext)_context.CreateDbContext();
        var manifest = await ctx.InboundManifests.FirstAsync();
        manifest.Status = InboundManifestStatus.Closed;
        await ctx.SaveChangesAsync(CancellationToken.None);

        var dto = new ReceiveWalkInParcelDto("WALKIN-MANIFESTED-001", null, null, null, null, null);
        var result = await _handler.Handle(new ReceiveWalkInParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot.ToString());
        result.IsMisdirected.Should().BeFalse();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
