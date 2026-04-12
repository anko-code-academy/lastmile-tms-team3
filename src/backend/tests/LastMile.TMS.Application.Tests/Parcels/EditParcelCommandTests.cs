using FluentAssertions;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;

namespace LastMile.TMS.Application.Tests.Parcels;

public class EditParcelCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly EditParcel.Handler _handler;
    private readonly FakeCurrentUserService _currentUser;

    private readonly Guid _parcelId = Guid.NewGuid();

    public EditParcelCommandTests()
    {
        _context = TestAppDbContext.Create<EditParcelCommandTests>();
        _currentUser = new FakeCurrentUserService();
        _handler = new EditParcel.Handler(_context, _currentUser); // TestAppDbContext implements IAppDbContextFactory
        SeedTestData();
    }

    private void SeedTestData()
    {
        var recipientAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Main St",
            City = "Nashville",
            State = "TN",
            PostalCode = "37201",
            CountryCode = "US",
            ContactName = "Alice",
            IsResidential = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var shipperAddress = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "456 Sender Ave",
            City = "Memphis",
            State = "TN",
            PostalCode = "38101",
            CountryCode = "US",
            ContactName = "Bob",
            IsResidential = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var parcel = new Parcel
        {
            Id = _parcelId,
            TrackingNumber = "LMT-EDIT-001",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            RecipientAddressId = recipientAddress.Id,
            RecipientAddress = recipientAddress,
            ShipperAddressId = shipperAddress.Id,
            ShipperAddress = shipperAddress,
            Weight = 2.0m,
            WeightUnit = WeightUnit.Kg,
            Length = 10,
            Width = 10,
            Height = 10,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 100,
            Currency = "USD",
            Notes = "Original notes",
            DeliveryAttempts = 0,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Addresses.AddRange(recipientAddress, shipperAddress);
        _context.Parcels.Add(parcel);
        _context.SaveChanges();
    }

    private EditParcelDto BuildDto(
        string? notes = "Updated notes",
        decimal weight = 3.5m,
        string recipientStreet = "999 New St",
        ParcelStatus? overrideStatus = null)
    {
        if (overrideStatus.HasValue)
        {
            var p = _context.Parcels.Find(_parcelId)!;
            p.Status = overrideStatus.Value;
            _context.SaveChanges();
        }

        return new EditParcelDto(
            _parcelId,
            "Updated description",
            new CreateAddressDto(
                recipientStreet, null, "Nashville", "TN", "37201", "US",
                true, "Alice Updated", null, "555-1234", "alice@test.com", null, null),
            new CreateAddressDto(
                "456 Sender Ave", null, "Memphis", "TN", "38101", "US",
                false, "Bob", null, null, null, null, null),
            weight,
            WeightUnit.Kg,
            15, 10, 8,
            DimensionUnit.Cm,
            150,
            "USD",
            "Box",
            notes,
            DateTimeOffset.UtcNow.AddDays(3)
        );
    }

    [Fact]
    public async Task EditParcel_WhenRegistered_UpdatesFieldsAndCreatesAuditLog()
    {
        var dto = BuildDto();

        var result = await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        result.Weight.Should().Be(3.5m);
        result.Notes.Should().Be("Updated notes");
        result.Description.Should().Be("Updated description");
        result.ChangeHistory.Should().HaveCount(1);
        var entry = result.ChangeHistory[0];
        entry.ActionType.Should().Be(AuditActionType.Update);
        entry.ActorUserName.Should().Be("testuser");
        entry.BeforeValuesJson.Should().NotBeNull();
        entry.AfterValuesJson.Should().NotBeNull();
    }

    [Fact]
    public async Task EditParcel_WhenReceivedAtDepot_Succeeds()
    {
        var dto = BuildDto(overrideStatus: ParcelStatus.ReceivedAtDepot);

        var result = await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.ReceivedAtDepot);
        result.Weight.Should().Be(3.5m);
    }

    [Fact]
    public async Task EditParcel_WhenSorted_Succeeds()
    {
        var dto = BuildDto(overrideStatus: ParcelStatus.Sorted);

        var result = await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Sorted);
    }

    [Fact]
    public async Task EditParcel_WhenStaged_Succeeds()
    {
        var dto = BuildDto(overrideStatus: ParcelStatus.Staged);

        var result = await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        result.Status.Should().Be(ParcelStatus.Staged);
    }

    [Fact]
    public async Task EditParcel_WhenLoaded_ThrowsInvalidOperationException()
    {
        var dto = BuildDto(overrideStatus: ParcelStatus.Loaded);

        var act = async () => await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be edited*");
    }

    [Fact]
    public async Task EditParcel_WhenCancelled_ThrowsParcelInTerminalStateException()
    {
        var dto = BuildDto(overrideStatus: ParcelStatus.Cancelled);

        var act = async () => await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<ParcelInTerminalStateException>();
    }

    [Fact]
    public async Task EditParcel_ParcelNotFound_ThrowsInvalidOperationException()
    {
        var dto = new EditParcelDto(
            Guid.NewGuid(), null,
            new CreateAddressDto("X", null, "C", "S", "00000", "US", false, null, null, null, null, null, null),
            new CreateAddressDto("Y", null, "C", "S", "00000", "US", false, null, null, null, null, null, null),
            1, WeightUnit.Kg, 1, 1, 1, DimensionUnit.Cm, 0, "USD", null, null, null);

        var act = async () => await _handler.Handle(new EditParcel.Command(dto), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*not found*");
    }

    public void Dispose() => _context.Dispose();
}
