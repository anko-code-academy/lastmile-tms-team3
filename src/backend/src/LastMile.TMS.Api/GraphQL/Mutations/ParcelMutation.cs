using HotChocolate.Types.Relay;
using LastMile.TMS.Application.Features.Parcels.Commands;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using MediatR;

namespace LastMile.TMS.Api.GraphQL.Mutations;

[ExtendObjectType(OperationTypeNames.Mutation)]
public class ParcelMutation
{
    public async Task<ParcelDto> CreateParcel(
        [Service] IMediator mediator,
        CreateParcelDto input,
        CancellationToken cancellationToken = default)
    {
        return await mediator.Send(new CreateParcel.Command(input), cancellationToken);
    }
}
