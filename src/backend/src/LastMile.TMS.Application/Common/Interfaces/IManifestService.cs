using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Common.Interfaces;

public interface IManifestService
{
    byte[] GenerateManifest(DeliveryRoute route);
}
