using HotChocolate.Authorization;
using HotChocolate.Types;
using LastMile.TMS.Application.Users.Commands.CreateUser;
using LastMile.TMS.Application.Users.Commands.DeactivateUser;
using LastMile.TMS.Application.Users.Commands.SendPasswordResetEmail;
using LastMile.TMS.Domain.Enums;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

public record CreateUserInput(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    UserRole Role,
    Guid? AssignedZoneId,
    Guid? AssignedDepotId,
    string InitialPassword);

[ExtendObjectType(OperationTypeNames.Mutation)]
[Authorize(Roles = new[] { "Admin" })]
public class UserMutation
{
    public async Task<Guid> CreateUserAsync(
        CreateUserInput input,
        [Service] ISender sender,
        CancellationToken cancellationToken)
        => await sender.Send(new CreateUserCommand(
            input.FirstName,
            input.LastName,
            input.Email,
            input.Phone,
            input.Role,
            input.AssignedZoneId,
            input.AssignedDepotId,
            input.InitialPassword), cancellationToken);

    public async Task<bool> DeactivateUserAsync(
        Guid id,
        [Service] ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(new DeactivateUserCommand(id), cancellationToken);
        return true;
    }

    public async Task<bool> SendPasswordResetAsync(
        Guid id,
        [Service] ISender sender,
        CancellationToken cancellationToken)
    {
        await sender.Send(new SendPasswordResetEmailCommand(id), cancellationToken);
        return true;
    }
}
