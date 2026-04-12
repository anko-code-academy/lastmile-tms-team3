namespace LastMile.TMS.Application.Features.Routes.DTOs;

public record StopOrderEntry(Guid ParcelId, int StopOrder);

public record ReorderStopsDto(Guid RouteId, List<StopOrderEntry> NewOrder);
