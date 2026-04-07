using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;

namespace LastMile.TMS.Application.Tests.Parcels;

public class ParcelStatusCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly TransitionParcelStatus.Handler _transitionHandler;
    private readonly MarkParcelDelivered.Handler _deliveredHandler;

    private readonly Guid _parcelId = Guid.NewGuid();

    public ParcelStatusCommandTests()
    {
        _context = TestAppDbContext.Create<ParcelStatusCommandTests>();
        _transitionHandler = new TransitionParcelStatus.Handler(_context);
        _deliveredHandler = new MarkParcelDelivered.Handler(_context);
        SeedTestData();
    }

    private void SeedTestData()
    {
        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test Street",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US",
            ContactName = "Alice",
            IsResidential = true
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Sender Ave",
            City = "SenderCity",
            State = "SS",
            PostalCode = "54321",
            CountryCode = "US",
            ContactName = "Bob",
            IsResidential = false
        };

        var parcel = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = "PKG-STATUS-001",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddress.Id,
            ShipperAddressId = shipperAddress.Id,
            Weight = 1.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 100,
            Currency = "USD",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();
    }

    [Fact]
    public async Task TransitionParcelStatus_ValidTransition_UpdatesStatusAndCreatesTrackingEvent()
    {
        var dto = new TransitionParcelStatusDto(
            _parcelId, ParcelStatus.ReceivedAtDepot, "Operator1", "Nashville", "TN", "US");

        var result = await _transitionHandler.Handle(
            new TransitionParcelStatus.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot);
        result.TrackingEvents.Should().HaveCount(1);
        var evt = result.TrackingEvents[0];
        evt.Operator.Should().Be("Operator1");
        evt.LocationCity.Should().Be("Nashville");
        evt.LocationState.Should().Be("TN");
        evt.LocationCountryCode.Should().Be("US");
    }

    [Fact]
    public async Task TransitionParcelStatus_FullLifecycle_RecordsAllEvents()
    {
        var transitions = new[]
        {
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
        };

        foreach (var status in transitions)
        {
            var dto = new TransitionParcelStatusDto(_parcelId, status, "Op", null, null, null);
            await _transitionHandler.Handle(
                new TransitionParcelStatus.Command(dto), CancellationToken.None);
        }

        var final = await _transitionHandler.Handle(
            new TransitionParcelStatus.Command(
                new TransitionParcelStatusDto(_parcelId, ParcelStatus.Delivered, "Op", null, null, null)),
            CancellationToken.None);

        final.Status.Should().Be(ParcelStatus.Delivered);
        final.TrackingEvents.Should().HaveCount(6);
        final.ActualDeliveryDate.Should().NotBeNull();
    }

    [Fact]
    public async Task TransitionParcelStatus_InvalidTransition_ThrowsInvalidStatusTransitionException()
    {
        var dto = new TransitionParcelStatusDto(
            _parcelId, ParcelStatus.OutForDelivery, null, null, null, null);

        var act = async () => await _transitionHandler.Handle(
            new TransitionParcelStatus.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidStatusTransitionException>();
    }

    [Fact]
    public async Task TransitionParcelStatus_ParcelNotFound_ThrowsInvalidOperationException()
    {
        var dto = new TransitionParcelStatusDto(
            Guid.NewGuid(), ParcelStatus.ReceivedAtDepot, null, null, null, null);

        var act = async () => await _transitionHandler.Handle(
            new TransitionParcelStatus.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Parcel*not found*");
    }

    [Fact]
    public async Task MarkParcelDelivered_FromOutForDelivery_CreatesDeliveryConfirmation()
    {
        // Advance to OutForDelivery
        var statuses = new[]
        {
            ParcelStatus.ReceivedAtDepot,
            ParcelStatus.Sorted,
            ParcelStatus.Staged,
            ParcelStatus.Loaded,
            ParcelStatus.OutForDelivery,
        };
        foreach (var s in statuses)
        {
            await _transitionHandler.Handle(
                new TransitionParcelStatus.Command(
                    new TransitionParcelStatusDto(_parcelId, s, null, null, null, null)),
                CancellationToken.None);
        }

        var dto = new MarkParcelDeliveredDto(
            _parcelId, "Alice", "Front Door", null, null, 36.1627, -86.7816, "Driver1", "Nashville", "TN", "US");

        var result = await _deliveredHandler.Handle(
            new MarkParcelDelivered.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Delivered);
        result.DeliveryConfirmation.Should().NotBeNull();
        result.DeliveryConfirmation!.ReceivedBy.Should().Be("Alice");
        result.DeliveryConfirmation.DeliveryLocation.Should().Be("Front Door");
        result.ActualDeliveryDate.Should().NotBeNull();
    }

    [Fact]
    public async Task MarkParcelDelivered_ParcelNotFound_ThrowsInvalidOperationException()
    {
        var dto = new MarkParcelDeliveredDto(
            Guid.NewGuid(), "Someone", null, null, null, null, null, null, null, null, null);

        var act = async () => await _deliveredHandler.Handle(
            new MarkParcelDelivered.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*Parcel*not found*");
    }

    public void Dispose() => _context.Dispose();
}
