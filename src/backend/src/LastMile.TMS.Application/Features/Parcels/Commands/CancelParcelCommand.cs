using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class CancelParcel
{
    public record Command(CancelParcelDto Dto) : IRequest<ParcelDto>;

    public class Handler(IAppDbContext context, ICurrentUserService currentUser)
        : IRequestHandler<Command, ParcelDto>
    {
        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var dto = request.Dto;

            if (string.IsNullOrWhiteSpace(dto.CancelReason))
                throw new ArgumentException("Cancel reason is required.", nameof(dto.CancelReason));

            var parcel = await context.Parcels
                .Include(p => p.RecipientAddress)
                .Include(p => p.ShipperAddress)
                .Include(p => p.TrackingEvents)
                .Include(p => p.ContentItems)
                .Include(p => p.Watchers)
                .Include(p => p.DeliveryConfirmation)
                .Include(p => p.Zone)
                .FirstOrDefaultAsync(p => p.Id == dto.ParcelId, cancellationToken)
                ?? throw new InvalidOperationException($"Parcel {dto.ParcelId} not found.");

            parcel.TransitionToStatus(
                ParcelStatus.Cancelled,
                dto.OperatorName);

            var now = DateTimeOffset.UtcNow;
            parcel.LastModifiedAt = now;
            parcel.LastModifiedBy = currentUser.UserId;

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                OccurredAt = now,
                ActorUserId = currentUser.UserId,
                ActorUserName = currentUser.UserName,
                ActionType = AuditActionType.StatusTransition,
                ResourceType = AuditResourceType.Parcel,
                ResourceId = parcel.Id.ToString(),
                Summary = $"Parcel {parcel.TrackingNumber} cancelled: {dto.CancelReason}",
            };

            context.AuditLogs.Add(auditLog);
            await context.SaveChangesAsync(cancellationToken);

            var auditLogs = await context.AuditLogs
                .Where(a => a.ResourceType == AuditResourceType.Parcel && a.ResourceId == parcel.Id.ToString())
                .OrderByDescending(a => a.OccurredAt)
                .ToListAsync(cancellationToken);

            return ParcelMapper.ToDto(parcel, auditLogs);
        }
    }
}
