namespace LastMile.TMS.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    Guid? AssignedDepotId { get; }
    bool IsInRole(string role);
}
