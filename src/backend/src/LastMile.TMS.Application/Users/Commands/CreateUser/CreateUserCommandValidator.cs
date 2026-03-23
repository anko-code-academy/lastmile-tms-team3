using FluentValidation;

namespace LastMile.TMS.Application.Users.Commands.CreateUser;

public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Phone).MaximumLength(30).When(x => x.Phone is not null);
        RuleFor(x => x.InitialPassword).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Role).IsInEnum();
    }
}
