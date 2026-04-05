using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class ParcelContentItemType : ObjectType<ParcelContentItem>
{
    protected override void Configure(IObjectTypeDescriptor<ParcelContentItem> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.HsCode);
        descriptor.Field(x => x.Description);
        descriptor.Field(x => x.Quantity);
        descriptor.Field(x => x.UnitValue);
        descriptor.Field(x => x.Currency);
        descriptor.Field(x => x.Weight);
        descriptor.Field(x => x.WeightUnit);
        descriptor.Field(x => x.OriginCountryCode);
    }
}
