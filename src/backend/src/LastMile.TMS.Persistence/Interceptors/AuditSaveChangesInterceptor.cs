using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using LastMile.TMS.Application.Common.Interfaces;
using LastMile.TMS.Domain.Common;
using LastMile.TMS.Domain.Entities;
using LastMile.TMS.Domain.Enums;
using LastMile.TMS.Persistence.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;

namespace LastMile.TMS.Persistence.Interceptors;

public sealed class AuditSaveChangesInterceptor(IHttpContextAccessor httpContextAccessor) : SaveChangesInterceptor
{
    private const string IsActivePropertyName = "IsActive";
    private const string SystemActorUserId = "system";
    private const string SystemActorUserName = "System";

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private static readonly HashSet<string> IgnoredPropertyNames = new(StringComparer.OrdinalIgnoreCase)
    {
        nameof(BaseEntity.Id),
        nameof(BaseAuditableEntity.CreatedAt),
        nameof(BaseAuditableEntity.CreatedBy),
        nameof(BaseAuditableEntity.LastModifiedAt),
        nameof(BaseAuditableEntity.LastModifiedBy),
        nameof(AppUser.PasswordHash),
        nameof(AppUser.SecurityStamp),
        nameof(AppUser.ConcurrencyStamp),
        nameof(AppUser.NormalizedEmail),
        nameof(AppUser.NormalizedUserName),
        nameof(AppUser.AccessFailedCount),
        nameof(AppUser.LockoutEnabled),
        nameof(AppUser.LockoutEnd),
        nameof(AppUser.TwoFactorEnabled),
        nameof(AppUser.EmailConfirmed),
        nameof(AppUser.PhoneNumberConfirmed)
    };

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        ApplyAuditLogging(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyAuditLogging(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditLogging(DbContext? context)
    {
        if (context is null)
            return;

        RejectAuditLogMutations(context);

        var currentUserService = httpContextAccessor.HttpContext?.RequestServices.GetService<ICurrentUserService>();
        var actorUserId = currentUserService?.UserId
            ?? httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? SystemActorUserId;
        var actorUserName = currentUserService?.UserName
            ?? httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name)
            ?? SystemActorUserName;
        var correlationId = httpContextAccessor.HttpContext?.TraceIdentifier;

        StampAuditableEntities(context, actorUserId);

        var entries = context.ChangeTracker
            .Entries()
            .Where(entry => entry.Entity is IAuditTracked)
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (entries.Count == 0)
            return;

        var occurredAt = DateTimeOffset.UtcNow;

        foreach (var entry in entries)
        {
            var resourceType = GetResourceType(entry.Entity);
            var actionType = GetActionType(entry);
            var resourceId = GetResourceId(entry);
            var (beforeValuesJson, afterValuesJson) = CreateValueSnapshots(entry, actionType);

            context.Set<AuditLog>().Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                OccurredAt = occurredAt,
                ActorUserId = actorUserId,
                ActorUserName = actorUserName,
                ActionType = actionType,
                ResourceType = resourceType,
                ResourceId = resourceId,
                CorrelationId = correlationId,
                Summary = BuildSummary(entry, resourceType, actionType),
                BeforeValuesJson = beforeValuesJson,
                AfterValuesJson = afterValuesJson
            });
        }
    }

    private static void RejectAuditLogMutations(DbContext context)
    {
        var forbiddenEntries = context.ChangeTracker
            .Entries<AuditLog>()
            .Where(entry => entry.State is EntityState.Modified or EntityState.Deleted)
            .ToList();

        if (forbiddenEntries.Count > 0)
            throw new InvalidOperationException("Audit logs are append-only and cannot be updated or deleted.");
    }

    private static void StampAuditableEntities(DbContext context, string? actorUserId)
    {
        var now = DateTimeOffset.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<BaseAuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt <= DateTimeOffset.MinValue)
                    entry.Entity.CreatedAt = now;

                entry.Entity.CreatedBy ??= actorUserId;
                entry.Entity.LastModifiedAt = null;
                entry.Entity.LastModifiedBy = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedAt = now;
                entry.Entity.LastModifiedBy = actorUserId;
            }
        }

        foreach (var entry in context.ChangeTracker.Entries<AppUser>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.CreatedAt <= DateTimeOffset.MinValue)
                    entry.Entity.CreatedAt = now;

                entry.Entity.CreatedBy ??= actorUserId;
                entry.Entity.LastModifiedAt = null;
                entry.Entity.LastModifiedBy = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedAt = now;
                entry.Entity.LastModifiedBy = actorUserId;
            }
        }
    }

    private static AuditResourceType GetResourceType(object entity)
    {
        return entity switch
        {
            Parcel => AuditResourceType.Parcel,
            AppUser => AuditResourceType.User,
            Vehicle => AuditResourceType.Vehicle,
            Depot => AuditResourceType.Depot,
            Zone => AuditResourceType.Zone,
            Driver => AuditResourceType.Driver,
            _ => throw new InvalidOperationException($"Unsupported audited entity type: {entity.GetType().Name}")
        };
    }

    private static AuditActionType GetActionType(EntityEntry entry)
    {
        if (entry.State == EntityState.Added)
            return AuditActionType.Create;

        if (entry.State == EntityState.Deleted)
            return AuditActionType.Delete;

        if (entry.Entity is Parcel && entry.Property(nameof(Parcel.Status)).IsModified)
            return AuditActionType.StatusTransition;

        if (entry.Entity is Vehicle && entry.Property(nameof(Vehicle.Status)).IsModified)
            return AuditActionType.StatusTransition;

        if (HasModifiedIsActiveProperty(entry))
        {
            var isActive = (bool?)entry.Property(IsActivePropertyName).CurrentValue;
            return isActive == true ? AuditActionType.Activate : AuditActionType.Deactivate;
        }

        return AuditActionType.Update;
    }

    private static string GetResourceId(EntityEntry entry)
    {
        return entry.Entity switch
        {
            BaseEntity entity => entity.Id.ToString(),
            AppUser user => user.Id.ToString(),
            _ => string.Join(',', entry.Properties.Where(property => property.Metadata.IsPrimaryKey()).Select(property => property.CurrentValue?.ToString()))
        };
    }

    private static (string? BeforeValuesJson, string? AfterValuesJson) CreateValueSnapshots(EntityEntry entry, AuditActionType actionType)
    {
        Dictionary<string, object?>? beforeValues = null;
        Dictionary<string, object?>? afterValues = null;

        if (entry.State == EntityState.Added)
        {
            afterValues = CreateAddedOrDeletedValues(entry, useOriginalValues: false);
        }
        else if (entry.State == EntityState.Deleted)
        {
            beforeValues = CreateAddedOrDeletedValues(entry, useOriginalValues: true);
        }
        else
        {
            beforeValues = CreateModifiedValues(entry, useOriginalValues: true, actionType);
            afterValues = CreateModifiedValues(entry, useOriginalValues: false, actionType);
        }

        return (SerializeValues(beforeValues), SerializeValues(afterValues));
    }

    private static Dictionary<string, object?> CreateAddedOrDeletedValues(EntityEntry entry, bool useOriginalValues)
    {
        var values = new Dictionary<string, object?>
        {
            [nameof(BaseEntity.Id)] = GetResourceId(entry)
        };

        foreach (var property in entry.Properties)
        {
            if (ShouldIgnoreProperty(property.Metadata.Name))
                continue;

            values[property.Metadata.Name] = NormalizeAuditValue(
                useOriginalValues ? property.OriginalValue : property.CurrentValue);
        }

        return values;
    }

    private static Dictionary<string, object?> CreateModifiedValues(EntityEntry entry, bool useOriginalValues, AuditActionType actionType)
    {
        var values = new Dictionary<string, object?>
        {
            [nameof(BaseEntity.Id)] = GetResourceId(entry)
        };

        foreach (var property in entry.Properties)
        {
            if (ShouldIgnoreProperty(property.Metadata.Name))
                continue;

            values[property.Metadata.Name] = NormalizeAuditValue(
                useOriginalValues ? property.OriginalValue : property.CurrentValue);
        }

        return values;
    }

    private static object? NormalizeAuditValue(object? value)
    {
        return value switch
        {
            null => null,
            Geometry geometry => new AuditGeometrySnapshot(
                geometry.GeometryType,
                geometry.SRID,
                geometry.AsText()),
            double doubleValue when double.IsInfinity(doubleValue) || double.IsNaN(doubleValue) => doubleValue.ToString(),
            float floatValue when float.IsInfinity(floatValue) || float.IsNaN(floatValue) => floatValue.ToString(),
            _ => value
        };
    }

    private static string? SerializeValues(Dictionary<string, object?>? values)
    {
        if (values is null || values.Count == 0)
            return null;

        return JsonSerializer.Serialize(values, JsonSerializerOptions);
    }

    private static bool ShouldIgnoreProperty(string propertyName)
    {
        return IgnoredPropertyNames.Contains(propertyName);
    }

    private static string BuildSummary(EntityEntry entry, AuditResourceType resourceType, AuditActionType actionType)
    {
        return (resourceType, actionType) switch
        {
            (AuditResourceType.Parcel, AuditActionType.Create) => "Parcel created",
            (AuditResourceType.Parcel, AuditActionType.Update) => "Parcel updated",
            (AuditResourceType.Parcel, AuditActionType.StatusTransition) => BuildParcelStatusTransitionSummary(entry),
            (AuditResourceType.User, AuditActionType.Create) => "User created",
            (AuditResourceType.User, AuditActionType.Update) => "User updated",
            (AuditResourceType.User, AuditActionType.Activate) => "User activated",
            (AuditResourceType.User, AuditActionType.Deactivate) => "User deactivated",
            (AuditResourceType.User, AuditActionType.Delete) => "User deleted",
            (AuditResourceType.Vehicle, AuditActionType.Create) => "Vehicle created",
            (AuditResourceType.Vehicle, AuditActionType.Update) => "Vehicle updated",
            (AuditResourceType.Vehicle, AuditActionType.StatusTransition) => BuildVehicleStatusTransitionSummary(entry),
            (AuditResourceType.Depot, AuditActionType.Create) => "Depot created",
            (AuditResourceType.Depot, AuditActionType.Update) => "Depot updated",
            (AuditResourceType.Depot, AuditActionType.Activate) => "Depot activated",
            (AuditResourceType.Depot, AuditActionType.Deactivate) => "Depot deactivated",
            (AuditResourceType.Zone, AuditActionType.Create) => "Zone created",
            (AuditResourceType.Zone, AuditActionType.Update) => "Zone updated",
            (AuditResourceType.Zone, AuditActionType.Activate) => "Zone activated",
            (AuditResourceType.Zone, AuditActionType.Deactivate) => "Zone deactivated",
            (AuditResourceType.Driver, AuditActionType.Create) => "Driver created",
            (AuditResourceType.Driver, AuditActionType.Update) => "Driver updated",
            (AuditResourceType.Driver, AuditActionType.Activate) => "Driver activated",
            (AuditResourceType.Driver, AuditActionType.Deactivate) => "Driver deactivated",
            _ => $"{resourceType} {actionType}"
        };
    }

    private static bool HasModifiedIsActiveProperty(EntityEntry entry)
    {
        var isActiveProperty = entry.Properties.FirstOrDefault(property => property.Metadata.Name == IsActivePropertyName);
        return isActiveProperty?.IsModified == true;
    }

    private static string BuildParcelStatusTransitionSummary(EntityEntry entry)
    {
        var statusProperty = entry.Property(nameof(Parcel.Status));
        var previousStatus = statusProperty.OriginalValue?.ToString() ?? "Unknown";
        var currentStatus = statusProperty.CurrentValue?.ToString() ?? "Unknown";
        return $"Parcel status changed from {previousStatus} to {currentStatus}";
    }

    private static string BuildVehicleStatusTransitionSummary(EntityEntry entry)
    {
        var statusProperty = entry.Property(nameof(Vehicle.Status));
        var previousStatus = statusProperty.OriginalValue?.ToString() ?? "Unknown";
        var currentStatus = statusProperty.CurrentValue?.ToString() ?? "Unknown";
        return $"Vehicle status changed from {previousStatus} to {currentStatus}";
    }

    private sealed record AuditGeometrySnapshot(string Type, int Srid, string Wkt);
}