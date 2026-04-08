using FluentAssertions;
using LastMile.TMS.Api.Hubs;
using LastMile.TMS.Application.Services;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace LastMile.TMS.Api.Tests.Hubs;

public class SignalRImportProgressNotifierTests
{
    [Fact]
    public async Task NotifyProgressAsync_SendsToCorrectGroup()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var hubContext = Substitute.For<IHubContext<ImportProgressHub>>();
        var groupProxy = Substitute.For<IClientProxy>();
        hubContext.Clients.Group($"import-{importId}").Returns(groupProxy);

        var notifier = new SignalRImportProgressNotifier(hubContext);

        // Act
        await notifier.NotifyProgressAsync(importId, 5, 10, "LMT-TEST", 5);

        // Assert
        await groupProxy.Received(1).SendCoreAsync(
            "ImportProgress",
            Arg.Any<object[]>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task NotifyProgressAsync_SendsPayloadWithPercentComplete()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var hubContext = Substitute.For<IHubContext<ImportProgressHub>>();
        var groupProxy = Substitute.For<IClientProxy>();
        hubContext.Clients.Group($"import-{importId}").Returns(groupProxy);

        object? capturedPayload = null;
        groupProxy.SendCoreAsync("ImportProgress", Arg.Do<object[]>(args => capturedPayload = args[0]), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        var notifier = new SignalRImportProgressNotifier(hubContext);

        // Act
        await notifier.NotifyProgressAsync(importId, 5, 10, "LMT-TEST", 5);

        // Assert
        capturedPayload.Should().NotBeNull();
        var type = capturedPayload!.GetType();
        type.GetProperty("CurrentRow")!.GetValue(capturedPayload).Should().Be(5);
        type.GetProperty("TotalRows")!.GetValue(capturedPayload).Should().Be(10);
        type.GetProperty("PercentComplete")!.GetValue(capturedPayload).Should().Be(50);
        type.GetProperty("CurrentTrackingNumber")!.GetValue(capturedPayload).Should().Be("LMT-TEST");
        type.GetProperty("ParcelsCreated")!.GetValue(capturedPayload).Should().Be(5);
    }

    [Fact]
    public async Task NotifyCompletedAsync_SendsToCorrectGroup()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var hubContext = Substitute.For<IHubContext<ImportProgressHub>>();
        var groupProxy = Substitute.For<IClientProxy>();
        hubContext.Clients.Group($"import-{importId}").Returns(groupProxy);

        var notifier = new SignalRImportProgressNotifier(hubContext);

        // Act
        await notifier.NotifyCompletedAsync(importId, 10, 8);

        // Assert
        await groupProxy.Received(1).SendCoreAsync(
            "ImportCompleted",
            Arg.Any<object[]>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task NotifyCompletedAsync_SendsPayloadWithCorrectTotals()
    {
        // Arrange
        var importId = Guid.NewGuid();
        var hubContext = Substitute.For<IHubContext<ImportProgressHub>>();
        var groupProxy = Substitute.For<IClientProxy>();
        hubContext.Clients.Group($"import-{importId}").Returns(groupProxy);

        object? capturedPayload = null;
        groupProxy.SendCoreAsync("ImportCompleted", Arg.Do<object[]>(args => capturedPayload = args[0]), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        var notifier = new SignalRImportProgressNotifier(hubContext);

        // Act
        await notifier.NotifyCompletedAsync(importId, 10, 8);

        // Assert
        capturedPayload.Should().NotBeNull();
        var type = capturedPayload!.GetType();
        type.GetProperty("TotalRows")!.GetValue(capturedPayload).Should().Be(10);
        type.GetProperty("ParcelsCreated")!.GetValue(capturedPayload).Should().Be(8);
    }
}
