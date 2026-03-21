using FluentValidation;

namespace LastMile.TMS.Application.Features.Zones.Commands;

public class CreateZoneValidator : AbstractValidator<CreateZone.Command>
{
    public CreateZoneValidator()
    {
        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Dto.DepotId)
            .NotEmpty().WithMessage("Depot is required");

        RuleFor(x => x.Dto.Boundary)
            .Must(b => b == null || (b.Coordinates.Count >= 4))
            .WithMessage("Boundary must have at least 4 coordinates to form a polygon");
    }
}

public class UpdateZoneValidator : AbstractValidator<UpdateZone.Command>
{
    public UpdateZoneValidator()
    {
        RuleFor(x => x.Dto.Id)
            .NotEmpty().WithMessage("Zone ID is required");

        RuleFor(x => x.Dto.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200);

        RuleFor(x => x.Dto.DepotId)
            .NotEmpty().WithMessage("Depot is required");

        RuleFor(x => x.Dto.Boundary)
            .Must(b => b == null || (b.Coordinates.Count >= 4))
            .WithMessage("Boundary must have at least 4 coordinates to form a polygon");
    }
}