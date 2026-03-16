using System.Text;

namespace LastMile.TMS.Domain.Services;

public static class TrackingNumberGenerator
{
    private const string Prefix = "LMT";
    private static readonly Random _random = new();

    public static string Generate()
    {
        var now = DateTimeOffset.UtcNow;
        var datePart = now.ToString("yyMMdd");
        var randomPart = _random.Next(100000, 999999).ToString(); // 6-digit random
        return $"{Prefix}{datePart}{randomPart}";
    }

    public static string GenerateWithSequence(int sequence)
    {
        var now = DateTimeOffset.UtcNow;
        var datePart = now.ToString("yyMMdd");
        var sequencePart = sequence.ToString("D6"); // 6-digit zero-padded
        return $"{Prefix}{datePart}{sequencePart}";
    }
}