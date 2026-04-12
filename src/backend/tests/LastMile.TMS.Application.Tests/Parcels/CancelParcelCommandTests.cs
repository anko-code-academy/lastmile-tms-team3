using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;

namespace LastMile.TMS.Application.Tests.Parcels;

public class CancelParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly CancelParcel.Handler _handler;

    private readonly Guid _parcelId = Guid.NewGuid();

    public CancelParcelCommandTests()
    {
        _context = TestAppDbContext.Create<CancelParcelCommandTests>();
        _handler = new CancelParcel.Handler(_context, new FakeCurrentUserService());
        SeedTestData();
    }

    private void SeedTestData()
    {
        var recipient = new Address
        {
            Id = Guid.NewGuid(), Street1 = "1 Main St", City = "A", State = "B",
            PostalCode = "00000", CountryCode = "US", IsResidential = true, CreatedAt = DateTimeOffset.UtcNow
        };
        var shipper = new Address
        {
            Id = Guid.NewGuid(), Street1 = "2 Elm St", City = "C", State = "D",
            PostalCode = "00001", CountryCode = "US", IsResidential = false, CreatedAt = DateTimeOffset.UtcNow
        };
        var parcel = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = "LMT-CANCEL-001",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipient.Id,
            RecipientAddress = recipient,
            ShipperAddressId = shipper.Id,
            ShipperAddress = shipper,
            Weight = 1m, WeightUnit = WeightUnit.Kg,
            Length = 5, Width = 5, Height = 5, DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50, Currency = "USD",
            DeliveryAttempts = 0, CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Addresses.AddRange(recipient, shipper);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();
    }

    private void SetStatus(ParcelStatus status)
    {
        var p = _context.Parcels.Find(_parcelId)!;
        p.Status = status;
        _context.SaveChanges();
    }

    [Theory]
    [InlineData(ParcelStatus.Registered)]
    [InlineData(ParcelStatus.ReceivedAtDepot)]
    [InlineData(ParcelStatus.Sorted)]
    [InlineData(ParcelStatus.Staged)]
    public async Task CancelParcel_AllowedStatuses_SetsCancelledAndCreatesAuditLog(ParcelStatus status)
    {
        SetStatus(status);
        var dto = new CancelParcelDto(_parcelId, "Customer request", "Operator1");

        var result = await _handler.Handle(new CancelParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Cancelled);
        result.TrackingEvents.Should().Contain(e => e.EventType == EventType.Exception);
        result.ChangeHistory.Should().HaveCount(1);
        var entry = result.ChangeHistory[0];
        entry.ActionType.Should().Be(AuditActionType.StatusTransition);
        entry.Summary.Should().Contain("Customer request");
    }

    [Theory]
    [InlineData(ParcelStatus.Loaded)]
    [InlineData(ParcelStatus.OutForDelivery)]
    public async Task CancelParcel_NotAllowedStatuses_ThrowsInvalidStatusTransitionException(ParcelStatus status)
    {
        SetStatus(status);
        var dto = new CancelParcelDto(_parcelId, "Reason", null);

        var act = async () => await _handler.Handle(new CancelParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task CancelParcel_EmptyReason_ThrowsArgumentException()
    {
        var dto = new CancelParcelDto(_parcelId, "   ", null);

        var act = async () => await _handler.Handle(new CancelParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("*reason*");
    }

    [Fact]
    public async Task CancelParcel_ParcelNotFound_ThrowsInvalidOperationException()
    {
        var dto = new CancelParcelDto(Guid.NewGuid(), "reason", null);

        var act = async () => await _handler.Handle(new CancelParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    public void Dispose() => _context.Dispose();
}
