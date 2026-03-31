using FluentValidation;
using LastMile.TMS.Application.Features.Drivers.Commands;

namespace LastMile.TMS.Application.Features.Drivers.Validators;

public class CreateDriverValidator : AbstractValidator<CreateDriver.Command>
{
    public CreateDriverValidator()
    {
        RuleFor(x => x.Dto.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100);

        RuleFor(x => x.Dto.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100);

        RuleFor(x => x.Dto.Phone)
            .NotEmpty().WithMessage("Phone is required")
            .MaximumLength(20);

        RuleFor(x => x.Dto.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Email must be a valid email address")
            .MaximumLength(256);

        RuleFor(x => x.Dto.LicenseNumber)
            .NotEmpty().WithMessage("License number is required")
            .MaximumLength(50);

        RuleFor(x => x.Dto.LicenseExpiryDate)
            .Must(d => d >= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("License expiry date must be today or in the future");
    }
}

public class UpdateDriverValidator : AbstractValidator<UpdateDriver.Command>
{
    public UpdateDriverValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Driver ID is required");

        RuleFor(x => x.Dto.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100);

        RuleFor(x => x.Dto.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100);

        RuleFor(x => x.Dto.Phone)
            .NotEmpty().WithMessage("Phone is required")
            .MaximumLength(20);

        RuleFor(x => x.Dto.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Email must be a valid email address")
            .MaximumLength(256);

        RuleFor(x => x.Dto.LicenseNumber)
            .NotEmpty().WithMessage("License number is required")
            .MaximumLength(50);

        RuleFor(x => x.Dto.LicenseExpiryDate)
            .Must(d => d >= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("License expiry date must be today or in the future");
    }
}

public class UpdateDriverStatusValidator : AbstractValidator<UpdateDriverStatus.Command>
{
    public UpdateDriverStatusValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Driver ID is required");
    }
}

public class LinkDriverUserValidator : AbstractValidator<LinkDriverUser.Command>
{
    public LinkDriverUserValidator()
    {
        RuleFor(x => x.Dto.DriverId)
            .NotEmpty().WithMessage("Driver ID is required");
    }
}
