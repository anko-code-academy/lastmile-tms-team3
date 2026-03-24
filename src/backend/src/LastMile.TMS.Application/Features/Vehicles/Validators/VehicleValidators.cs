using FluentValidation;
using LastMile.TMS.Application.Features.Vehicles.Commands;
using LastMile.TMS.Application.Features.Vehicles.DTOs;

namespace LastMile.TMS.Application.Features.Vehicles.Validators;

public class CreateVehicleValidator : AbstractValidator<CreateVehicle.Command>
{
    public CreateVehicleValidator()
    {
        RuleFor(x => x.Dto.RegistrationPlate)
            .NotEmpty().WithMessage("Registration plate is required")
            .MaximumLength(20);

        RuleFor(x => x.Dto.ParcelCapacity)
            .GreaterThan(0).WithMessage("Parcel capacity must be greater than zero");

        RuleFor(x => x.Dto.WeightCapacity)
            .GreaterThan(0).WithMessage("Weight capacity must be greater than zero");

        RuleFor(x => x.Dto.DepotId)
            .NotEmpty().WithMessage("Depot ID is required");
    }
}

public class UpdateVehicleValidator : AbstractValidator<UpdateVehicle.Command>
{
    public UpdateVehicleValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Vehicle ID is required");

        RuleFor(x => x.Dto.RegistrationPlate)
            .MaximumLength(20).When(x => x.Dto.RegistrationPlate is not null);

        RuleFor(x => x.Dto.ParcelCapacity)
            .GreaterThan(0).When(x => x.Dto.ParcelCapacity.HasValue)
            .WithMessage("Parcel capacity must be greater than zero");

        RuleFor(x => x.Dto.WeightCapacity)
            .GreaterThan(0).When(x => x.Dto.WeightCapacity.HasValue)
            .WithMessage("Weight capacity must be greater than zero");
    }
}

public class UpdateVehicleStatusValidator : AbstractValidator<UpdateVehicleStatus.Command>
{
    public UpdateVehicleStatusValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Vehicle ID is required");
    }
}

public class UpdateVehicleDepotValidator : AbstractValidator<UpdateVehicleDepot.Command>
{
    public UpdateVehicleDepotValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Vehicle ID is required");

        RuleFor(x => x.Dto.DepotId)
            .NotEmpty().WithMessage("Depot ID is required");
    }
}
