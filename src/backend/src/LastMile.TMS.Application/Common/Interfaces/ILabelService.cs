using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Application.Common.Interfaces;

public interface ILabelService
{
    string GenerateZpl(Parcel parcel);
    byte[] GeneratePdf(Parcel parcel);
    byte[] GenerateBulkPdf(IEnumerable<Parcel> parcels);
}
