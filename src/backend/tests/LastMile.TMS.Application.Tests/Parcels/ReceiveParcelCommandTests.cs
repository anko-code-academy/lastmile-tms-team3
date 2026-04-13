using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Tests.Parcels;

public class ReceiveParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly ReceiveParcel.Handler _receiveHandler;
    private readonly StartReceivingSession.Handler _startSessionHandler;
    private readonly CompleteReceivingSession.Handler _completeSessionHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _manifestId = Guid.NewGuid();
    private readonly Guid _addressId = Guid.NewGuid();
    private readonly string _manifestNumber = "MFT-20260412-001";

    public ReceiveParcelCommandTests()
    {
        _context = TestAppDbContext.Create<ReceiveParcelCommandTests>();
        _receiveHandler = new ReceiveParcel.Handler(_context);
        _startSessionHandler = new StartReceivingSession.Handler(_context);
        _completeSessionHandler = new CompleteReceivingSession.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = Guid.NewGuid(),
            CreatedAt = DateTimeOffset.UtcNow
        };

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

        var manifest = new InboundManifest
        {
            Id = _manifestId,
            ManifestNumber = _manifestNumber,
            DepotId = _depotId,
            Status = InboundManifestStatus.Sealed,
            MaxParcels = 10,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Parcels in the manifest
        var parcel1 = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "RECV-TEST-001",
            ServiceType = ServiceType.Standard,
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

        var parcel2 = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "RECV-TEST-002",
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

        // Parcel NOT in manifest (walk-in)
        var walkInParcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "RECV-WALKIN-001",
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

        manifest.Parcels.Add(parcel1);
        manifest.Parcels.Add(parcel2);

        _context.Depots.Add(depot);
        _context.Addresses.Add(address);
        _context.Parcels.AddRange(parcel1, parcel2, walkInParcel);
        _context.InboundManifests.Add(manifest);
        _context.SaveChanges();
    }

    [Fact]
    public async Task StartReceivingSession_CreatesSession()
    {
        var dto = new StartReceivingSessionDto(_manifestId, "D1");
        var result = await _startSessionHandler.Handle(new StartReceivingSession.Command(dto), CancellationToken.None);

        result.SessionId.Should().NotBeEmpty();
        result.ManifestId.Should().Be(_manifestId);
        result.DockDoor.Should().Be("D1");

        var session = await _context.InboundReceivingSessions.FindAsync(result.SessionId);
        session.Should().NotBeNull();
        session!.Status.Should().Be(InboundReceivingSessionStatus.Open);
        session.DockDoor.Should().Be("D1");
    }

    [Fact]
    public async Task ReceiveParcel_ParcelInManifest_TransitionsToReceivedAtDepot()
    {
        // Start session first
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var dto = new ReceiveParcelDto("RECV-TEST-001", sessionResult.SessionId, null, null, null, null);
        var result = await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot.ToString());
        result.IsUnexpected.Should().BeFalse();
        result.TrackingNumber.Should().Be("RECV-TEST-001");
    }

    [Fact]
    public async Task ReceiveParcel_ParcelNotInManifest_FlaggedAsMisdirectedException()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var dto = new ReceiveParcelDto("RECV-WALKIN-001", sessionResult.SessionId, null, null, null, null);
        var result = await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Exception.ToString());
        result.IsUnexpected.Should().BeTrue();
    }

    [Fact]
    public async Task ReceiveParcel_ParcelNotInManifest_ParcelEntityHasExceptionStatus()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var dto = new ReceiveParcelDto("RECV-WALKIN-001", sessionResult.SessionId, null, null, null, null);
        await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        // Use the factory to get a context sharing the same InMemory DB
        using var readContext = (TestAppDbContext)_context.CreateDbContext();
        var parcel = await readContext.Parcels.FirstAsync(p => p.TrackingNumber == "RECV-WALKIN-001");
        parcel.Status.Should().Be(ParcelStatus.Exception);
    }

    [Fact]
    public async Task ReceiveParcel_ParcelNotFound_Throws()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var dto = new ReceiveParcelDto("NONEXISTENT-001", sessionResult.SessionId, null, null, null, null);
        var act = () => _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task ReceiveParcel_AlreadyReceivedInSameManifest_ReturnsAlreadyReceived()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var dto = new ReceiveParcelDto("RECV-TEST-001", sessionResult.SessionId, null, null, null, null);
        await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        // Scan the same parcel again — should return friendly result, not throw
        var result = await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);

        result.IsUnexpected.Should().BeFalse();
        result.IsAlreadyReceived.Should().BeTrue();
        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot.ToString());
    }

    [Fact]
    public async Task ReceiveParcel_AlreadyReceivedNotInManifest_FlaggedAsException()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        // Receive the walk-in parcel first (it gets Exception since it's not in manifest)
        var dto = new ReceiveParcelDto("RECV-WALKIN-001", sessionResult.SessionId, null, null, null, null);
        var firstResult = await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);
        firstResult.Status.Should().Be(ParcelStatus.Exception.ToString());

        // Scan again — already in Exception, not in manifest — should return already-received as exception
        var secondResult = await _receiveHandler.Handle(new ReceiveParcel.Command(dto), CancellationToken.None);
        secondResult.IsUnexpected.Should().BeTrue();
        secondResult.IsAlreadyReceived.Should().BeTrue();
        secondResult.Status.Should().Be(ParcelStatus.Exception.ToString());
    }

    [Fact]
    public async Task CompleteReceivingSession_MarksMissingParcelsAsException()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        var sessionResult = await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        // Receive only one of the two parcels
        var receiveDto = new ReceiveParcelDto("RECV-TEST-001", sessionResult.SessionId, null, null, null, null);
        await _receiveHandler.Handle(new ReceiveParcel.Command(receiveDto), CancellationToken.None);

        var completeDto = new CompleteReceivingSessionDto(sessionResult.SessionId, "operator");
        var result = await _completeSessionHandler.Handle(new CompleteReceivingSession.Command(completeDto), CancellationToken.None);

        result.ExpectedCount.Should().Be(2);
        result.ReceivedCount.Should().Be(1);
        result.MissingCount.Should().Be(1);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task StartReceivingSession_SecondOpenSessionOnSameManifest_Throws()
    {
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        var act = () => _startSessionHandler.Handle(
            new StartReceivingSession.Command(new StartReceivingSessionDto(_manifestId, "D2")),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already has an open session*");
    }

    [Fact]
    public async Task StartReceivingSession_DifferentManifest_Succeeds()
    {
        // Start session on first manifest
        var sessionDto = new StartReceivingSessionDto(_manifestId, "D1");
        await _startSessionHandler.Handle(new StartReceivingSession.Command(sessionDto), CancellationToken.None);

        // Create a second manifest and start session on it — should succeed
        var manifest2 = new InboundManifest
        {
            Id = Guid.NewGuid(),
            ManifestNumber = "MFT-20260412-002",
            DepotId = _depotId,
            Status = InboundManifestStatus.Sealed,
            MaxParcels = 5,
            CreatedAt = DateTimeOffset.UtcNow
        };
        using var ctx = (TestAppDbContext)_context.CreateDbContext();
        ctx.InboundManifests.Add(manifest2);
        await ctx.SaveChangesAsync(CancellationToken.None);

        var act = () => _startSessionHandler.Handle(
            new StartReceivingSession.Command(new StartReceivingSessionDto(manifest2.Id, "D2")),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}
