using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Bins.Commands;
using LastMile.TMS.Application.Features.Bins.DTOs;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Tests.Bins;

public class BinCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly CreateBin.Handler _createHandler;
    private readonly UpdateBin.Handler _updateHandler;
    private readonly DeleteBin.Handler _deleteHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();
    private readonly Guid _aisleId = Guid.NewGuid();
    private readonly Guid _binId = Guid.NewGuid();

    public BinCommandTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
        var codeGenerator = new WarehouseCodeGenerator(_context);
        _createHandler = new CreateBin.Handler(_context, _currentUser, codeGenerator);
        _updateHandler = new UpdateBin.Handler(_context, _currentUser);
        _deleteHandler = new DeleteBin.Handler(_context, _currentUser);

        SeedTestData();
    }

    private void SeedTestData()
    {
        var address = new Address
        {
            Id = Guid.NewGuid(),
            Street1 = "123 Test St",
            City = "TestCity",
            State = "TS",
            PostalCode = "12345",
            CountryCode = "US"
        };

        var depot = new Depot
        {
            Id = _depotId,
            Name = "Test Depot",
            IsActive = true,
            AddressId = address.Id,
            Address = address
        };

        var zone = new Zone
        {
            Id = _zoneId,
            Name = "Test Zone",
            IsActive = true,
            DepotId = _depotId,
            Depot = depot
        };

        var aisle = new Aisle
        {
            Id = _aisleId,
            Name = "Aisle A",
            Code = "A",
            SortOrder = 1,
            IsActive = true,
            ZoneId = _zoneId,
            Zone = zone
        };

        var bin = new Bin
        {
            Id = _binId,
            AisleId = _aisleId,
            Aisle = aisle,
            Name = "Bin A-01",
            Code = "A-01",
            LabelCode = "BIN-TEST-A01",
            CapacityParcelCount = 80,
            IsActive = true
        };

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.Zones.Add(zone);
        _context.Aisles.Add(aisle);
        _context.Bins.Add(bin);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateBin_WithValidInput_CreatesBin()
    {
        var command = new CreateBin.Command(
            new CreateBinDto(_aisleId, "Bin A-02", "A-02", 90, true));

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Name.Should().Be("Bin A-02");
        result.AisleId.Should().Be(_aisleId);
        result.CapacityParcelCount.Should().Be(90);
    }

    [Fact]
    public async Task UpdateBin_WithValidInput_UpdatesBin()
    {
        var command = new UpdateBin.Command(
            new UpdateBinDto(_binId, "Bin A-01 Updated", "A-01", 120, false));

        var result = await _updateHandler.Handle(command, CancellationToken.None);

        result.Name.Should().Be("Bin A-01 Updated");
        result.CapacityParcelCount.Should().Be(120);
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateBin_ThrowsInvalidOperationException_WhenBinHasParcels()
    {
        var addressId = _context.Addresses.Single().Id;
        _context.Parcels.Add(new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "BIN-UPDATE-TEST",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            ShipperAddressId = addressId,
            RecipientAddressId = addressId,
            Weight = 1m,
            WeightUnit = WeightUnit.Kg,
            Length = 10m,
            Width = 10m,
            Height = 10m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50m,
            Currency = "USD",
            Description = "Bin update guard",
            ParcelType = "Standard",
            CurrentBinId = _binId,
            CreatedAt = DateTimeOffset.UtcNow
        });
        _context.SaveChanges();

        var act = async () => await _updateHandler.Handle(
            new UpdateBin.Command(new UpdateBinDto(_binId, "Bin A-01 Updated", "A-01", 120, false)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be edited or made inactive while parcels are assigned*" );
    }

    [Fact]
    public async Task CreateBin_WithBlankCode_GeneratesCode_AndLabelCode()
    {
        var command = new CreateBin.Command(
            new CreateBinDto(_aisleId, "Bin Generated", string.Empty, 90, true));

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Code.Should().NotBeNullOrWhiteSpace();
        result.LabelCode.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task DeleteBin_WithNoParcels_ReturnsTrue()
    {
        var command = new DeleteBin.Command(_binId);

        var result = await _deleteHandler.Handle(command, CancellationToken.None);

        result.Should().BeTrue();
        _context.Bins.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteBin_ThrowsInvalidOperationException_WhenBinHasParcels()
    {
        var addressId = _context.Addresses.Single().Id;
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "BIN-DELETE-TEST",
            ServiceType = ServiceType.Standard,
            Status = ParcelStatus.Registered,
            ShipperAddressId = addressId,
            RecipientAddressId = addressId,
            Weight = 1m,
            WeightUnit = WeightUnit.Kg,
            Length = 10m,
            Width = 10m,
            Height = 10m,
            DimensionUnit = DimensionUnit.Cm,
            DeclaredValue = 50m,
            Currency = "USD",
            Description = "Bin delete guard",
            ParcelType = "Standard",
            CurrentBinId = _binId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.Parcels.Add(parcel);
        _context.SaveChanges();

        var act = async () => await _deleteHandler.Handle(new DeleteBin.Command(_binId), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be deleted while parcels are assigned*");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}