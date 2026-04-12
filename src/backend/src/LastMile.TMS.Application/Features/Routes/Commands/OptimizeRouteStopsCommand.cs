using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Routes.DTOs;
using LastMile.TMS.Application.Features.Routes.Helpers;
using LastMile.TMS.Application.Features.Routes.Mappers;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Application.Features.Routes.Commands;

public static class OptimizeRouteStops
{
    public record Command(Guid RouteId) : IRequest<RouteDto>;

    public class Handler : IRequestHandler<Command, RouteDto>
    {
        private readonly IAppDbContextFactory _contextFactory;
        private readonly IRouteOptimizationService _optimizationService;
        private readonly ILogger<Handler> _logger;

        public Handler(
            IAppDbContextFactory contextFactory,
            IRouteOptimizationService optimizationService,
            ILogger<Handler> logger)
        {
            _contextFactory = contextFactory;
            _optimizationService = optimizationService;
            _logger = logger;
        }

        public async Task<RouteDto> Handle(Command request, CancellationToken cancellationToken)
        {
            using var context = _contextFactory.CreateDbContext();

            var route = await context.DeliveryRoutes
                .Include(r => r.RouteParcels)
                    .ThenInclude(rp => rp.Parcel)
                        .ThenInclude(p => p.RecipientAddress)
                .Include(r => r.Depot)
                    .ThenInclude(d => d.Address)
                .Include(r => r.Zone)
                .Include(r => r.Driver)
                .Include(r => r.Vehicle)
                .FirstOrDefaultAsync(r => r.Id == request.RouteId, cancellationToken)
                ?? throw new InvalidOperationException(
                    $"Route with ID '{request.RouteId}' was not found.");

            if (route.Status != RouteStatus.Draft)
                throw new InvalidOperationException(
                    "Stop order can only be optimized for a route in Draft status.");

            if (route.RouteParcels.Count == 0)
            {
                return RouteMapper.ToDto(route);
            }

            // Check all parcels have geocoded addresses
            var missingGeo = route.RouteParcels
                .Where(rp => rp.Parcel?.RecipientAddress?.GeoLocation == null)
                .ToList();

            if (missingGeo.Count > 0)
                throw new RouteOptimizationException(
                    $"{missingGeo.Count} parcel(s) are missing geocoded addresses. " +
                    "Please ensure all recipient addresses have been geocoded before optimizing.");

            // Build depot and stop locations
            var depotAddress = route.Depot?.Address;
            if (depotAddress?.GeoLocation == null)
                throw new RouteOptimizationException(
                    "Depot address is missing geocoded location. Please geocode the depot address first.");

            var depot = new StopLocation(Guid.Empty, depotAddress.GeoLocation.Y, depotAddress.GeoLocation.X);

            var stops = route.RouteParcels
                .OrderBy(rp => rp.StopOrder)
                .Select(rp => new StopLocation(
                    rp.ParcelId,
                    rp.Parcel?.RecipientAddress?.GeoLocation?.Y ?? throw new RouteOptimizationException(
                        $"Parcel '{rp.ParcelId}' is missing geocoded address data."),
                    rp.Parcel?.RecipientAddress?.GeoLocation?.X ?? throw new RouteOptimizationException(
                        $"Parcel '{rp.ParcelId}' is missing geocoded address data.")))
                .ToList();

            // Optimize with fallback
            OptimizedRoute result;
            try
            {
                result = await _optimizationService.OptimizeAsync(depot, stops, cancellationToken);
            }
            catch (Exception ex) when (ex is not RouteOptimizationException)
            {
                _logger.LogWarning(ex, "Optimization service failed, falling back to nearest-neighbor");
                result = NearestNeighborFallback.Optimize(depot, stops);
            }

            route.ApplyOptimizedStopOrder(result.OptimizedOrder, (decimal)result.TotalDistanceMeters, (int)result.TotalDurationSeconds);

            await context.SaveChangesAsync(cancellationToken);

            return RouteMapper.ToDto(route);
        }
    }
}
