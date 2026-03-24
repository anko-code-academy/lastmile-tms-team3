using LastMile.TMS.Domain.Enums;
using MediatR;

namespace LastMile.TMS.Application.Users.Commands.CreateUser;

public record CreateUserCommand(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    UserRole Role,
    Guid? AssignedZoneId,
    Guid? AssignedDepotId,
    string InitialPassword) : IRequest<Guid>;
