using FluentValidation;
using LastMile.TMS.Application.Features.Parcels.Commands;

namespace LastMile.TMS.Application.Features.Parcels.Validators;

public class CreateParcelValidator : AbstractValidator<CreateParcel.Command>
{
    public CreateParcelValidator()
    {
        RuleFor(x => x.Dto.TrackingNumber)
            .NotEmpty().WithMessage("Tracking number is required")
            .MaximumLength(50);

        RuleFor(x => x.Dto.RecipientAddress)
            .NotNull().WithMessage("Recipient address is required");

        RuleFor(x => x.Dto.ShipperAddress)
            .NotNull().WithMessage("Shipper address is required");

        RuleFor(x => x.Dto.Weight)
            .GreaterThan(0).WithMessage("Weight must be greater than 0");

        RuleFor(x => x.Dto.Length)
            .GreaterThan(0).WithMessage("Length must be greater than 0");

        RuleFor(x => x.Dto.Width)
            .GreaterThan(0).WithMessage("Width must be greater than 0");

        RuleFor(x => x.Dto.Height)
            .GreaterThan(0).WithMessage("Height must be greater than 0");

        RuleFor(x => x.Dto.DeclaredValue)
            .GreaterThanOrEqualTo(0).WithMessage("Declared value cannot be negative");
    }
}
