using LastMile.TMS.Domain.Enums;

namespace LastMile.TMS.Application.Features.DeliveryRoutes.DTOs;

public record ParcelInfo(
    Guid ParcelId,
    string TrackingNumber,
    ParcelStatus Status
);
