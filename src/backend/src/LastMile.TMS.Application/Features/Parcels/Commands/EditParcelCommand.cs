using System.Text.Json;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Application.Features.Parcels.DTOs;
using LastMile.TMS.Application.Features.Parcels.Mappers;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Domain.Exceptions;
using LastMile.TMS.Domain.Rules;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LastMile.TMS.Application.Features.Parcels.Commands;

public static class EditParcel
{
    private static readonly HashSet<ParcelStatus> EditableStatuses =
    [
        ParcelStatus.Registered,
        ParcelStatus.ReceivedAtDepot,
        ParcelStatus.Sorted,
        ParcelStatus.Staged,
    ];

    public record Command(EditParcelDto Dto) : IRequest<ParcelDto>;

    public class Handler(IAppDbContext context, ICurrentUserService currentUser)
        : IRequestHandler<Command, ParcelDto>
    {
        public async Task<ParcelDto> Handle(Command request, CancellationToken cancellationToken)
        {
            var dto = request.Dto;

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

            if (ParcelStatusRules.IsTerminal(parcel.Status))
                throw new ParcelInTerminalStateException(parcel.Status);

            if (!EditableStatuses.Contains(parcel.Status))
                throw new InvalidOperationException(
                    $"Parcel in status '{parcel.Status}' cannot be edited. " +
                    $"Editing is allowed only when status is Registered, ReceivedAtDepot, Sorted, or Staged.");

            // Capture before state for audit
            var before = CaptureEditableFields(parcel);

            // Apply changes to addresses
            parcel.RecipientAddress.Street1 = dto.RecipientAddress.Street1;
            parcel.RecipientAddress.Street2 = dto.RecipientAddress.Street2;
            parcel.RecipientAddress.City = dto.RecipientAddress.City;
            parcel.RecipientAddress.State = dto.RecipientAddress.State;
            parcel.RecipientAddress.PostalCode = dto.RecipientAddress.PostalCode;
            parcel.RecipientAddress.CountryCode = dto.RecipientAddress.CountryCode;
            parcel.RecipientAddress.IsResidential = dto.RecipientAddress.IsResidential;
            parcel.RecipientAddress.ContactName = dto.RecipientAddress.ContactName;
            parcel.RecipientAddress.CompanyName = dto.RecipientAddress.CompanyName;
            parcel.RecipientAddress.Phone = dto.RecipientAddress.Phone;
            parcel.RecipientAddress.Email = dto.RecipientAddress.Email;

            parcel.ShipperAddress.Street1 = dto.ShipperAddress.Street1;
            parcel.ShipperAddress.Street2 = dto.ShipperAddress.Street2;
            parcel.ShipperAddress.City = dto.ShipperAddress.City;
            parcel.ShipperAddress.State = dto.ShipperAddress.State;
            parcel.ShipperAddress.PostalCode = dto.ShipperAddress.PostalCode;
            parcel.ShipperAddress.CountryCode = dto.ShipperAddress.CountryCode;
            parcel.ShipperAddress.IsResidential = dto.ShipperAddress.IsResidential;
            parcel.ShipperAddress.ContactName = dto.ShipperAddress.ContactName;
            parcel.ShipperAddress.CompanyName = dto.ShipperAddress.CompanyName;
            parcel.ShipperAddress.Phone = dto.ShipperAddress.Phone;
            parcel.ShipperAddress.Email = dto.ShipperAddress.Email;

            // Apply changes to parcel
            parcel.Description = dto.Description;
            parcel.Weight = dto.Weight;
            parcel.WeightUnit = dto.WeightUnit;
            parcel.Length = dto.Length;
            parcel.Width = dto.Width;
            parcel.Height = dto.Height;
            parcel.DimensionUnit = dto.DimensionUnit;
            parcel.DeclaredValue = dto.DeclaredValue;
            parcel.Currency = dto.Currency;
            parcel.ParcelType = dto.ParcelType;
            parcel.Notes = dto.Notes;
            parcel.EstimatedDeliveryDate = dto.EstimatedDeliveryDate;

            var now = DateTimeOffset.UtcNow;
            parcel.LastModifiedAt = now;
            parcel.LastModifiedBy = currentUser.UserId;

            var after = CaptureEditableFields(parcel);

            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                OccurredAt = now,
                ActorUserId = currentUser.UserId,
                ActorUserName = currentUser.UserName,
                ActionType = AuditActionType.Update,
                ResourceType = AuditResourceType.Parcel,
                ResourceId = parcel.Id.ToString(),
                Summary = $"Parcel {parcel.TrackingNumber} edited",
                BeforeValuesJson = JsonSerializer.Serialize(before),
                AfterValuesJson = JsonSerializer.Serialize(after),
            };

            context.AuditLogs.Add(auditLog);
            await context.SaveChangesAsync(cancellationToken);

            var auditLogs = await context.AuditLogs
                .Where(a => a.ResourceType == AuditResourceType.Parcel && a.ResourceId == parcel.Id.ToString())
                .OrderByDescending(a => a.OccurredAt)
                .ToListAsync(cancellationToken);

            return ParcelMapper.ToDto(parcel, auditLogs);
        }

        private static object CaptureEditableFields(Parcel p) => new
        {
            p.Description,
            p.Weight,
            p.WeightUnit,
            p.Length,
            p.Width,
            p.Height,
            p.DimensionUnit,
            p.DeclaredValue,
            p.Currency,
            p.ParcelType,
            p.Notes,
            p.EstimatedDeliveryDate,
            RecipientAddress = new
            {
                p.RecipientAddress.Street1,
                p.RecipientAddress.Street2,
                p.RecipientAddress.City,
                p.RecipientAddress.State,
                p.RecipientAddress.PostalCode,
                p.RecipientAddress.ContactName,
                p.RecipientAddress.Phone,
                p.RecipientAddress.Email,
            },
            ShipperAddress = new
            {
                p.ShipperAddress.Street1,
                p.ShipperAddress.Street2,
                p.ShipperAddress.City,
                p.ShipperAddress.State,
                p.ShipperAddress.PostalCode,
                p.ShipperAddress.ContactName,
                p.ShipperAddress.Phone,
                p.ShipperAddress.Email,
            }
        };
    }
}
