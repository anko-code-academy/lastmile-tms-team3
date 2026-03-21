using FluentValidation;
using LastMile.TMS.Application.Features.Depots.DTOs;

namespace LastMile.TMS.Application.Features.Depots.Commands;

public class CreateDepotValidator : AbstractValidator<CreateDepot.Command>
{
    public CreateDepotValidator()
    {
        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Dto.Address.Street1)
            .NotEmpty().WithMessage("Street address is required");

        RuleFor(x => x.Dto.Address.City)
            .NotEmpty().WithMessage("City is required");

        RuleFor(x => x.Dto.Address.State)
            .NotEmpty().WithMessage("State is required");

        RuleFor(x => x.Dto.Address.PostalCode)
            .NotEmpty().WithMessage("Postal code is required");

        RuleFor(x => x.Dto.Address.CountryCode)
            .NotEmpty().WithMessage("Country is required")
            .Length(2).WithMessage("Use ISO 3166-1 alpha-2 country code");
    }
}

public class UpdateDepotValidator : AbstractValidator<UpdateDepot.Command>
{
    public UpdateDepotValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Depot ID is required");

        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Dto.Address.Street1)
            .NotEmpty().WithMessage("Street address is required");

        RuleFor(x => x.Dto.Address.City)
            .NotEmpty().WithMessage("City is required");

        RuleFor(x => x.Dto.Address.State)
            .NotEmpty().WithMessage("State is required");

        RuleFor(x => x.Dto.Address.PostalCode)
            .NotEmpty().WithMessage("Postal code is required");

        RuleFor(x => x.Dto.Address.CountryCode)
            .NotEmpty().WithMessage("Country is required")
            .Length(2).WithMessage("Use ISO 3166-1 alpha-2 country code");
    }
}