using FluentAssertions;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Aisles.Commands;
using LastMile.TMS.Application.Features.Aisles.DTOs;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Application.Tests.Helpers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Tests.Aisles;

public class AisleCommandTests : IDisposable
{
    private readonly TestAppDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly CreateAisle.Handler _createHandler;
    private readonly UpdateAisle.Handler _updateHandler;
    private readonly DeleteAisle.Handler _deleteHandler;

    private readonly Guid _depotId = Guid.NewGuid();
    private readonly Guid _zoneId = Guid.NewGuid();
    private readonly Guid _aisleId = Guid.NewGuid();

    public AisleCommandTests()
    {
        _context = TestAppDbContext.Create();
        _currentUser = new FakeCurrentUserService();
        var codeGenerator = new WarehouseCodeGenerator(_context);
        _createHandler = new CreateAisle.Handler(_context, _currentUser, codeGenerator);
        _updateHandler = new UpdateAisle.Handler(_context, _currentUser);
        _deleteHandler = new DeleteAisle.Handler(_context, _currentUser);

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

        _context.Addresses.Add(address);
        _context.Depots.Add(depot);
        _context.Zones.Add(zone);
        _context.Aisles.Add(aisle);
        _context.SaveChanges();
    }

    [Fact]
    public async Task CreateAisle_WithValidInput_CreatesAisle()
    {
        var command = new CreateAisle.Command(
            new CreateAisleDto(_zoneId, "Aisle B", "B", true));

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Name.Should().Be("Aisle B");
        result.ZoneId.Should().Be(_zoneId);
        result.SortOrder.Should().Be(2);
    }

    [Fact]
    public async Task CreateAisle_ThrowsUnauthorizedAccessException_ForOperationsManager()
    {
        var currentUser = new FakeCurrentUserService(_depotId, new[] { "OperationsManager" });
        var codeGenerator = new WarehouseCodeGenerator(_context);
        var handler = new CreateAisle.Handler(_context, currentUser, codeGenerator);

        var act = async () => await handler.Handle(
            new CreateAisle.Command(new CreateAisleDto(_zoneId, "Aisle B", "B", true)),
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task UpdateAisle_WithValidInput_UpdatesAisle()
    {
        var command = new UpdateAisle.Command(
            new UpdateAisleDto(_aisleId, "Aisle A Updated", false));

        var result = await _updateHandler.Handle(command, CancellationToken.None);

        result.Name.Should().Be("Aisle A Updated");
        result.Code.Should().Be("A");
        result.SortOrder.Should().Be(1);
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task CreateAisle_AppendsToHighestSortOrderInZone()
    {
        _context.Aisles.Add(new Aisle
        {
            Id = Guid.NewGuid(),
            Name = "Aisle Z",
            Code = "Z",
            SortOrder = 7,
            IsActive = true,
            ZoneId = _zoneId,
        });
        _context.SaveChanges();

        var result = await _createHandler.Handle(
            new CreateAisle.Command(new CreateAisleDto(_zoneId, "Aisle B", "B", true)),
            CancellationToken.None);

        result.SortOrder.Should().Be(8);
    }

    [Fact]
    public async Task UpdateAisle_WhenMadeInactive_MakesAllBinsInactive()
    {
        _context.Bins.AddRange(
            new Bin
            {
                Id = Guid.NewGuid(),
                AisleId = _aisleId,
                Name = "Bin A-01",
                Code = "A-01",
                LabelCode = "BIN-AISLE-INACTIVE-1",
                CapacityParcelCount = 50,
                IsActive = true
            },
            new Bin
            {
                Id = Guid.NewGuid(),
                AisleId = _aisleId,
                Name = "Bin A-02",
                Code = "A-02",
                LabelCode = "BIN-AISLE-INACTIVE-2",
                CapacityParcelCount = 50,
                IsActive = true
            });
        _context.SaveChanges();

        await _updateHandler.Handle(
            new UpdateAisle.Command(new UpdateAisleDto(_aisleId, "Aisle A Updated", false)),
            CancellationToken.None);

        using var verificationContext = (TestAppDbContext)_context.CreateDbContext();

        verificationContext.Bins.Where(bin => bin.AisleId == _aisleId)
            .Should()
            .OnlyContain(bin => !bin.IsActive);
    }

    [Fact]
    public async Task UpdateAisle_WhenMadeActive_MakesAllBinsActive()
    {
        var aisle = _context.Aisles.Single(a => a.Id == _aisleId);
        aisle.IsActive = false;

        _context.Bins.AddRange(
            new Bin
            {
                Id = Guid.NewGuid(),
                AisleId = _aisleId,
                Name = "Bin A-01",
                Code = "A-01",
                LabelCode = "BIN-AISLE-ACTIVE-1",
                CapacityParcelCount = 50,
                IsActive = false
            },
            new Bin
            {
                Id = Guid.NewGuid(),
                AisleId = _aisleId,
                Name = "Bin A-02",
                Code = "A-02",
                LabelCode = "BIN-AISLE-ACTIVE-2",
                CapacityParcelCount = 50,
                IsActive = false
            });
        _context.SaveChanges();

        await _updateHandler.Handle(
            new UpdateAisle.Command(new UpdateAisleDto(_aisleId, "Aisle A Updated", true)),
            CancellationToken.None);

        using var verificationContext = (TestAppDbContext)_context.CreateDbContext();

        verificationContext.Bins.Where(bin => bin.AisleId == _aisleId)
            .Should()
            .OnlyContain(bin => bin.IsActive);
    }

    [Fact]
    public async Task UpdateAisle_ThrowsInvalidOperationException_WhenAnyBinHasParcels()
    {
        var bin = new Bin
        {
            Id = Guid.NewGuid(),
            AisleId = _aisleId,
            Name = "Bin A-01",
            Code = "A-01",
            LabelCode = "BIN-AISLE-UPDATE",
            CapacityParcelCount = 50,
            IsActive = true
        };

        _context.Bins.Add(bin);
        var addressId = _context.Addresses.Single().Id;
        _context.Parcels.Add(new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "AISLE-UPDATE-TEST",
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
            Description = "Aisle update guard",
            ParcelType = "Standard",
            CurrentBinId = bin.Id,
            CreatedAt = DateTimeOffset.UtcNow
        });
        _context.SaveChanges();

        var act = async () => await _updateHandler.Handle(
            new UpdateAisle.Command(new UpdateAisleDto(_aisleId, "Aisle A Updated", false)),
            CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be edited or made inactive while bins still contain parcels*");
    }

    [Fact]
    public async Task CreateAisle_WithBlankCode_GeneratesCode()
    {
        var command = new CreateAisle.Command(
            new CreateAisleDto(_zoneId, "Aisle Generated", string.Empty, true));

        var result = await _createHandler.Handle(command, CancellationToken.None);

        result.Code.Should().NotBeNullOrWhiteSpace();
        result.Code.Should().NotBe(string.Empty);
    }

    [Fact]
    public async Task DeleteAisle_WithOnlyEmptyBins_ReturnsTrue()
    {
        _context.Bins.Add(new Bin
        {
            Id = Guid.NewGuid(),
            AisleId = _aisleId,
            Name = "Bin A-01",
            Code = "A-01",
            LabelCode = "BIN-AISLE-DELETE",
            CapacityParcelCount = 50,
            IsActive = true
        });
        _context.SaveChanges();

        var result = await _deleteHandler.Handle(new DeleteAisle.Command(_aisleId), CancellationToken.None);

        result.Should().BeTrue();
        _context.Aisles.Should().BeEmpty();
        _context.Bins.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteAisle_ThrowsInvalidOperationException_WhenAnyBinHasParcels()
    {
        var bin = new Bin
        {
            Id = Guid.NewGuid(),
            AisleId = _aisleId,
            Name = "Bin A-01",
            Code = "A-01",
            LabelCode = "BIN-AISLE-GUARD",
            CapacityParcelCount = 50,
            IsActive = true
        };

        _context.Bins.Add(bin);
        var addressId = _context.Addresses.Single().Id;
        var parcel = new Parcel
        {
            Id = Guid.NewGuid(),
            TrackingNumber = "AISLE-DELETE-TEST",
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
            Description = "Aisle delete guard",
            ParcelType = "Standard",
            CurrentBinId = bin.Id,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _context.Parcels.Add(parcel);
        _context.SaveChanges();

        var act = async () => await _deleteHandler.Handle(new DeleteAisle.Command(_aisleId), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*cannot be deleted while bins still contain parcels*");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}