using LastMile.TMS.Application.Users.Dtos;
using LastMile.TMS.Domain.Enums;
using MediatR;

namespace LastMile.TMS.Application.Users.Queries.GetUsers;

public record GetUsersQuery(string? SearchTerm, UserRole? Role) : IRequest<List<UserDto>>;
