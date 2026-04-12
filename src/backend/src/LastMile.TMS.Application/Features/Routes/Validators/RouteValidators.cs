using FluentValidation;
using LastMile.TMS.Application.Features.Routes.Commands;
using LastMile.TMS.Application.Features.Routes.DTOs;

namespace LastMile.TMS.Application.Features.Routes.Validators;

public class CreateRouteValidator : AbstractValidator<CreateRoute.Command>
{
    public CreateRouteValidator()
    {
        RuleFor(x => x.Dto.Date)
            .NotEmpty().WithMessage("Route date is required");

        RuleFor(x => x.Dto.ZoneId)
            .NotEmpty().WithMessage("Zone ID is required");
    }
}

public class AddParcelsToRouteValidator : AbstractValidator<AddParcelsToRoute.Command>
{
    public AddParcelsToRouteValidator()
    {
        RuleFor(x => x.Dto.RouteId)
            .NotEmpty().WithMessage("Route ID is required");

        RuleFor(x => x.Dto.ParcelIds)
            .NotEmpty().WithMessage("At least one parcel ID is required");
    }
}

public class RemoveParcelFromRouteValidator : AbstractValidator<RemoveParcelFromRoute.Command>
{
    public RemoveParcelFromRouteValidator()
    {
        RuleFor(x => x.Dto.RouteId)
            .NotEmpty().WithMessage("Route ID is required");

        RuleFor(x => x.Dto.ParcelId)
            .NotEmpty().WithMessage("Parcel ID is required");
    }
}

public class AutoAssignParcelsValidator : AbstractValidator<AutoAssignParcels.Command>
{
    public AutoAssignParcelsValidator()
    {
        RuleFor(x => x.RouteId)
            .NotEmpty().WithMessage("Route ID is required");
    }
}
