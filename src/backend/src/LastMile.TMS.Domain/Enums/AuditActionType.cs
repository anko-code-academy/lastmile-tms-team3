namespace LastMile.TMS.Domain.Enums;

public enum AuditActionType
{
    Create = 0,
    Update = 1,
    Delete = 2,
    StatusTransition = 3,
    Activate = 4,
    Deactivate = 5,
    SystemEvent = 6
}