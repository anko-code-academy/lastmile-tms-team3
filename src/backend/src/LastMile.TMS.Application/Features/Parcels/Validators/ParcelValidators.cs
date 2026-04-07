using FluentValidation;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;

namespace LastMile.TMS.Application.Features.Parcels.Validators;

public class CreateParcelValidator : AbstractValidator<CreateParcel.Command>
{
    public CreateParcelValidator()
    {
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

        RuleFor(x => x.Dto.Notes)
            .MaximumLength(500).WithMessage("Notes cannot exceed 500 characters");
    }
}

public class TransitionParcelStatusValidator : AbstractValidator<TransitionParcelStatus.Command>
{
    public TransitionParcelStatusValidator()
    {
        RuleFor(x => x.Dto.ParcelId)
            .NotEmpty().WithMessage("Parcel ID is required");

        RuleFor(x => x.Dto.NewStatus)
            .IsInEnum().WithMessage("Invalid parcel status");

        RuleFor(x => x.Dto.LocationCountryCode)
            .Matches(@"^[A-Z]{2}$")
            .When(x => !string.IsNullOrEmpty(x.Dto.LocationCountryCode))
            .WithMessage("Country code must be a two-letter ISO code");
    }
}

public class MarkParcelDeliveredValidator : AbstractValidator<MarkParcelDelivered.Command>
{
    public MarkParcelDeliveredValidator()
    {
        RuleFor(x => x.Dto.ParcelId)
            .NotEmpty().WithMessage("Parcel ID is required");

        RuleFor(x => x.Dto.ReceivedBy)
            .NotEmpty().WithMessage("ReceivedBy is required")
            .MaximumLength(200);
    }
}

public class SearchParcelDtoValidator : AbstractValidator<SearchParcelDto>
{
    public SearchParcelDtoValidator()
    {
        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("Page size must be between 1 and 100");

        RuleFor(x => x.DateFrom)
            .LessThanOrEqualTo(x => x.DateTo)
            .When(x => x.DateFrom.HasValue && x.DateTo.HasValue)
            .WithMessage("Date from must be less than or equal to date to");

        RuleFor(x => x.Search)
            .MaximumLength(200)
            .WithMessage("Search term must not exceed 200 characters");

        RuleFor(x => x.ParcelType)
            .MaximumLength(100)
            .WithMessage("Parcel type must not exceed 100 characters");
    }
}
