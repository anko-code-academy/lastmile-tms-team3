namespace LastMile.TMS.Application.Common.Interfaces;

public interface IGeocodingService
{
    Task<GeocodingResult?> GeocodeAsync(
        string street,
        string city,
        string state,
        string postalCode,
        string countryCode,
        CancellationToken cancellationToken = default);
}

public record GeocodingResult(double Latitude, double Longitude);
