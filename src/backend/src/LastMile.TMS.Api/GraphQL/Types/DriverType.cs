using HotChocolate.Types;
using LastMile.TMS.Domain.Entities;

namespace LastMile.TMS.Api.GraphQL.Types;

public class DriverType : ObjectType<Driver>
{
    protected override void Configure(IObjectTypeDescriptor<Driver> descriptor)
    {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(d => d.Id);
        descriptor.Field(d => d.FirstName)
            .IsProjected(true);
        descriptor.Field(d => d.LastName)
            .IsProjected(true);
        descriptor.Field("fullName")
            .Resolve(ctx => ctx.Parent<Driver>().FullName);
        descriptor.Field(d => d.Phone);
        descriptor.Field(d => d.Email);
        descriptor.Field(d => d.LicenseNumber);
        descriptor.Field(d => d.LicenseExpiryDate);
        descriptor.Field(d => d.PhotoUrl);
        descriptor.Field(d => d.DepotId);
        descriptor.Field(d => d.UserId);
        descriptor.Field(d => d.Depot).Type<DepotType>();
        descriptor.Field("availability")
            .Resolve(ctx => ctx.Parent<Driver>().Availability)
            .Type<OperatingHoursType>();
        descriptor.Field(d => d.IsActive);
        descriptor.Field(d => d.CreatedAt);
        descriptor.Field(d => d.LastModifiedAt);
    }
}
