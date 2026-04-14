using System.Globalization;
using System.Text.Json;
using LastMile.TMS.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace LastMile.TMS.Infrastructure.Services;

public class NominatimGeocodingService(
    HttpClient httpClient,
    ILogger<NominatimGeocodingService> logger) : IGeocodingService
{
    public async Task<GeocodingResult?> GeocodeAsync(
        string street,
        string city,
        string state,
        string postalCode,
        string countryCode,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = string.Join(", ",
                street,
                postalCode,
                city,
                state,
                countryCode);

            logger.LogInformation("Geocoding address: {Query}", query);

            var queryParams = new Dictionary<string, string>
            {
                ["q"] = query,
                ["format"] = "json",
                ["limit"] = "1",
                ["addressdetails"] = "0"
            };

            var uri = $"search?{await new FormUrlEncodedContent(queryParams).ReadAsStringAsync(cancellationToken)}";

            var response = await httpClient.GetAsync(uri, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Nominatim returned {StatusCode} for address: {Query}", response.StatusCode, query);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogInformation("Nominatim raw response: {Json}", json);

            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.ValueKind != JsonValueKind.Array || doc.RootElement.GetArrayLength() == 0)
            {
                logger.LogWarning("Nominatim returned no results for address: {Query}", query);
                return null;
            }

            var first = doc.RootElement[0];

            if (!first.TryGetProperty("lat", out var latElement) ||
                !first.TryGetProperty("lon", out var lonElement))
            {
                logger.LogWarning("Nominatim response missing lat/lon for address: {Query}", query);
                return null;
            }

            var latStr = latElement.GetString();
            var lonStr = lonElement.GetString();
            logger.LogInformation("Nominatim lat='{LatStr}' lon='{LonStr}'", latStr, lonStr);

            if (!double.TryParse(latStr, CultureInfo.InvariantCulture, out var lat) ||
                !double.TryParse(lonStr, CultureInfo.InvariantCulture, out var lon))
            {
                logger.LogWarning("Nominatim returned invalid lat/lon for address: {Query}. lat='{LatStr}' lon='{LonStr}'", query, latStr, lonStr);
                return null;
            }

            logger.LogInformation("Geocoded '{Query}' -> lat={Lat}, lon={Lon}", query, lat, lon);

            return new GeocodingResult(lat, lon);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Geocoding failed for address: {Street}, {City}, {State} {PostalCode} {Country}",
                street, city, state, postalCode, countryCode);
            return null;
        }
    }
}
