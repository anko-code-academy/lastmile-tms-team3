using FluentAssertions;
using LastMile.TMS.Api.Controllers;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Services;
using LastMile.TMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace LastMile.TMS.Api.Tests.Controllers;

public class ParcelImportControllerTests
{
    private readonly IParcelImportService _importService;
    private readonly ILogger<ParcelImportController> _logger;
    private readonly ParcelImportController _controller;

    public ParcelImportControllerTests()
    {
        _importService = Substitute.For<IParcelImportService>();
        _logger = Substitute.For<ILogger<ParcelImportController>>();
        _controller = new ParcelImportController(_importService, _logger);
    }

    [Fact]
    public async Task Confirm_WhenConcurrentRequest_ReturnsConflict()
    {
        // Arrange
        var importId = Guid.NewGuid();
        _importService.ExecuteImportAsync(importId, Arg.Any<CancellationToken>())
            .Returns<Task<ParcelImportResultDto>>(_ => throw new DbUpdateConcurrencyException("Concurrency conflict"));

        // Act
        var result = await _controller.Confirm(
            new ParcelImportConfirmDto(importId), CancellationToken.None);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        objectResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task Confirm_WhenInvalidState_ReturnsBadRequest()
    {
        // Arrange
        var importId = Guid.NewGuid();
        _importService.ExecuteImportAsync(importId, Arg.Any<CancellationToken>())
            .Returns<Task<ParcelImportResultDto>>(_ => throw new InvalidOperationException("Not in PreviewGenerated state"));

        // Act
        var result = await _controller.Confirm(
            new ParcelImportConfirmDto(importId), CancellationToken.None);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Confirm_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var expectedResult = new ParcelImportResultDto(
            importId, "test.csv", ImportStatus.Completed, 3, 2, 1, 2, new List<string>(), new List<ParcelImportRowDto>());

        _importService.ExecuteImportAsync(importId, Arg.Any<CancellationToken>())
            .Returns(expectedResult);

        // Act
        var result = await _controller.Confirm(
            new ParcelImportConfirmDto(importId), CancellationToken.None);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }
}
