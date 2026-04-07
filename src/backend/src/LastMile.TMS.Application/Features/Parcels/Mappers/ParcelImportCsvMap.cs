using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using LastMile.TMS.Application.Features.Depots.DTOs;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Domain.Enums;
using ServiceTypeEnum = LastMile.TMS.Domain.Enums.ServiceType;
using WeightUnitEnum = LastMile.TMS.Domain.Enums.WeightUnit;
using DimensionUnitEnum = LastMile.TMS.Domain.Enums.DimensionUnit;

namespace LastMile.TMS.Application.Features.Parcels.Mappers;

public sealed class ParcelImportCsvMap : ClassMap<ParcelImportRow>
{
    public ParcelImportCsvMap()
    {
        Map(m => m.RowNumber).Ignore();
        Map(m => m.RecipientContactName).Name("RecipientContactName");
        Map(m => m.RecipientCompanyName).Name("RecipientCompanyName").Optional();
        Map(m => m.RecipientStreet1).Name("RecipientStreet1");
        Map(m => m.RecipientStreet2).Name("RecipientStreet2").Optional();
        Map(m => m.RecipientCity).Name("RecipientCity");
        Map(m => m.RecipientState).Name("RecipientState");
        Map(m => m.RecipientPostalCode).Name("RecipientPostalCode");
        Map(m => m.RecipientCountryCode).Name("RecipientCountryCode").Default("US");
        Map(m => m.RecipientPhone).Name("RecipientPhone").Optional();
        Map(m => m.RecipientEmail).Name("RecipientEmail").Optional();
        Map(m => m.RecipientIsResidential).Name("RecipientIsResidential").Default(false);
        Map(m => m.ShipperContactName).Name("ShipperContactName");
        Map(m => m.ShipperCompanyName).Name("ShipperCompanyName").Optional();
        Map(m => m.ShipperStreet1).Name("ShipperStreet1");
        Map(m => m.ShipperStreet2).Name("ShipperStreet2").Optional();
        Map(m => m.ShipperCity).Name("ShipperCity");
        Map(m => m.ShipperState).Name("ShipperState");
        Map(m => m.ShipperPostalCode).Name("ShipperPostalCode");
        Map(m => m.ShipperCountryCode).Name("ShipperCountryCode").Default("US");
        Map(m => m.ShipperPhone).Name("ShipperPhone").Optional();
        Map(m => m.ShipperEmail).Name("ShipperEmail").Optional();
        Map(m => m.ShipperIsResidential).Name("ShipperIsResidential").Default(false);
        Map(m => m.Weight).Name("Weight");
        Map(m => m.WeightUnit).Name("WeightUnit").Default("LB");
        Map(m => m.Length).Name("Length");
        Map(m => m.Width).Name("Width");
        Map(m => m.Height).Name("Height");
        Map(m => m.DimensionUnit).Name("DimensionUnit").Default("IN");
        Map(m => m.DeclaredValue).Name("DeclaredValue").Default(0m);
        Map(m => m.Currency).Name("Currency").Default("USD");
        Map(m => m.ServiceType).Name("ServiceType");
        Map(m => m.ParcelType).Name("ParcelType").Optional();
        Map(m => m.Description).Name("Description").Optional();
        Map(m => m.Notes).Name("Notes").Optional();
    }
}

public class ParcelImportRow
{
    public int RowNumber { get; set; }
    public string RecipientContactName { get; set; } = string.Empty;
    public string? RecipientCompanyName { get; set; }
    public string RecipientStreet1 { get; set; } = string.Empty;
    public string? RecipientStreet2 { get; set; }
    public string RecipientCity { get; set; } = string.Empty;
    public string RecipientState { get; set; } = string.Empty;
    public string RecipientPostalCode { get; set; } = string.Empty;
    public string RecipientCountryCode { get; set; } = "US";
    public string? RecipientPhone { get; set; }
    public string? RecipientEmail { get; set; }
    public bool RecipientIsResidential { get; set; }
    public string ShipperContactName { get; set; } = string.Empty;
    public string? ShipperCompanyName { get; set; }
    public string ShipperStreet1 { get; set; } = string.Empty;
    public string? ShipperStreet2 { get; set; }
    public string ShipperCity { get; set; } = string.Empty;
    public string ShipperState { get; set; } = string.Empty;
    public string ShipperPostalCode { get; set; } = string.Empty;
    public string ShipperCountryCode { get; set; } = "US";
    public string? ShipperPhone { get; set; }
    public string? ShipperEmail { get; set; }
    public bool ShipperIsResidential { get; set; }
    public decimal Weight { get; set; }
    public string WeightUnit { get; set; } = "LB";
    public decimal Length { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public string DimensionUnit { get; set; } = "IN";
    public decimal DeclaredValue { get; set; }
    public string Currency { get; set; } = "USD";
    public string ServiceType { get; set; } = string.Empty;
    public string? ParcelType { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }

    public CreateParcelDto ToCreateParcelDto()
    {
        return new CreateParcelDto(
            Description: Description,
            ServiceType: ParseServiceType(ServiceType),
            RecipientAddress: new CreateAddressDto(
                Street1: RecipientStreet1,
                Street2: RecipientStreet2,
                City: RecipientCity,
                State: RecipientState,
                PostalCode: RecipientPostalCode,
                CountryCode: RecipientCountryCode,
                IsResidential: RecipientIsResidential,
                ContactName: RecipientContactName,
                CompanyName: RecipientCompanyName,
                Phone: RecipientPhone,
                Email: RecipientEmail
            ),
            ShipperAddress: new CreateAddressDto(
                Street1: ShipperStreet1,
                Street2: ShipperStreet2,
                City: ShipperCity,
                State: ShipperState,
                PostalCode: ShipperPostalCode,
                CountryCode: ShipperCountryCode,
                IsResidential: ShipperIsResidential,
                ContactName: ShipperContactName,
                CompanyName: ShipperCompanyName,
                Phone: ShipperPhone,
                Email: ShipperEmail
            ),
            Weight: Weight,
            WeightUnit: ParseWeightUnit(WeightUnit),
            Length: Length,
            Width: Width,
            Height: Height,
            DimensionUnit: ParseDimensionUnit(DimensionUnit),
            DeclaredValue: DeclaredValue,
            Currency: Currency,
            ParcelType: ParcelType,
            Notes: Notes
        );
    }

    private static ServiceTypeEnum ParseServiceType(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "ECONOMY" => ServiceTypeEnum.Economy,
            "STANDARD" => ServiceTypeEnum.Standard,
            "EXPRESS" => ServiceTypeEnum.Express,
            "OVERNIGHT" => ServiceTypeEnum.Overnight,
            _ => ServiceTypeEnum.Standard
        };
    }

    private static WeightUnitEnum ParseWeightUnit(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "KG" => WeightUnitEnum.Kg,
            "LB" => WeightUnitEnum.Lb,
            _ => WeightUnitEnum.Lb
        };
    }

    private static DimensionUnitEnum ParseDimensionUnit(string value)
    {
        return value.ToUpperInvariant() switch
        {
            "CM" => DimensionUnitEnum.Cm,
            "IN" => DimensionUnitEnum.In,
            _ => DimensionUnitEnum.In
        };
    }
}