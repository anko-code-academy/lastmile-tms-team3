"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { GET_AUDIT_LOG, GET_AUDIT_LOGS } from "@/lib/graphql/queries/auditLogs";
import { GET_USER } from "@/lib/graphql/queries/users";
import { AuditResourceType } from "@/lib/types/auditLog";
import type {
  AuditLogDetail,
  AuditLogListItem,
  AuditResourceContext,
  AuditLogSortBy,
  SearchAuditLogsInput,
  SearchAuditLogsResult,
  AuditUserContext,
} from "@/lib/types/auditLog";

interface AuditLogsResponse {
  auditLogs: {
    nodes: AuditLogListItem[];
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  };
}

interface AuditLogResponse {
  auditLog: AuditLogDetail | null;
}

interface UserLookupResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
}

interface DepotLookupResponse {
  depot: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
}

interface ZoneLookupResponse {
  zone: {
    id: string;
    name: string;
    isActive: boolean;
    depot: {
      name: string;
    } | null;
  } | null;
}

const GET_AUDIT_DEPOT = `
  query GetAuditDepot($id: UUID!) {
    depot(id: $id) {
      id
      name
      isActive
    }
  }
`;

const GET_AUDIT_ZONE = `
  query GetAuditZone($id: UUID!) {
    zone(id: $id) {
      id
      name
      isActive
      depot {
        name
      }
    }
  }
`;

export async function searchAuditLogsAction(
  input: SearchAuditLogsInput,
): Promise<SearchAuditLogsResult> {
  const pageSize = Math.min(Math.max(1, input.pageSize), 100);
  const isBackward = input.pagingDirection === "backward";
  const normalizedResourceId = normalizeString(input.resourceId);
  const from = toUtcIsoString(input.from);
  const to = toUtcIsoString(input.to);

  const data = await gqlFetch<AuditLogsResponse>(GET_AUDIT_LOGS, {
    actor: normalizeString(input.actor),
    where: buildAuditLogWhere(
      input.actionType,
      input.resourceType,
      normalizedResourceId,
      from,
      to,
    ),
    order: buildAuditLogOrder(input.sortBy, input.sortDirection),
    first: isBackward ? null : pageSize,
    last: isBackward ? pageSize : null,
    after: !isBackward && input.cursor ? input.cursor : null,
    before: isBackward && input.cursor ? input.cursor : null,
  });

  const { nodes, totalCount, pageInfo } = data.auditLogs;
  return {
    items: nodes,
    totalCount,
    hasNextPage: pageInfo.hasNextPage,
    hasPreviousPage: pageInfo.hasPreviousPage,
    nextCursor: pageInfo.endCursor ?? undefined,
    previousCursor: pageInfo.startCursor ?? undefined,
  };
}

export async function getAuditLogAction(
  id: string,
): Promise<AuditLogDetail | null> {
  const data = await gqlFetch<AuditLogResponse>(GET_AUDIT_LOG, { id });

  if (!data.auditLog) {
    return null;
  }

  const [actorDetails, resourceDetails] = await Promise.all([
    getActorDetails(data.auditLog.actorUserId),
    getResourceDetails(data.auditLog.resourceType, data.auditLog.resourceId),
  ]);

  return {
    ...data.auditLog,
    actorDetails,
    resourceDetails,
  };
}

function normalizeString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toUtcIsoString(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildAuditLogOrder(
  sortBy: AuditLogSortBy,
  sortDirection: "ASC" | "DESC",
) {
  switch (sortBy) {
    case "ACTION_TYPE":
      return [{ actionType: sortDirection }, { occurredAt: "DESC" }];
    case "RESOURCE_TYPE":
      return [{ resourceType: sortDirection }, { occurredAt: "DESC" }];
    case "ACTOR_USER_NAME":
      return [{ actorUserName: sortDirection }, { occurredAt: "DESC" }];
    case "OCCURRED_AT":
    default:
      return [{ occurredAt: sortDirection }];
  }
}

function buildAuditLogWhere(
  actionType: SearchAuditLogsInput["actionType"],
  resourceType: SearchAuditLogsInput["resourceType"],
  resourceId: string | null,
  from: string | null,
  to: string | null,
) {
  const where: Record<string, unknown> = {};

  if (actionType) {
    where.actionType = { eq: actionType };
  }

  if (resourceType) {
    where.resourceType = { eq: resourceType };
  }

  if (resourceId) {
    where.resourceId = { eq: resourceId };
  }

  if (from || to) {
    where.occurredAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  return Object.keys(where).length > 0 ? where : null;
}

async function getActorDetails(
  actorUserId?: string | null,
): Promise<AuditUserContext | null> {
  if (!actorUserId || !isGuid(actorUserId)) {
    return null;
  }

  const data = await gqlFetch<UserLookupResponse>(GET_USER, {
    id: actorUserId,
  });

  if (!data.user) {
    return null;
  }

  return {
    id: data.user.id,
    fullName: `${data.user.firstName} ${data.user.lastName}`.trim(),
    email: data.user.email,
    role: data.user.role,
    isActive: data.user.isActive,
    href: "/admin/users",
  };
}

async function getResourceDetails(
  resourceType: AuditResourceType,
  resourceId: string,
): Promise<AuditResourceContext | null> {
  switch (resourceType) {
    case AuditResourceType.Parcel:
      return {
        title: resourceId,
        subtitle: "Parcel record",
        href: `/parcels/${resourceId}`,
      };
    case AuditResourceType.Vehicle:
      return {
        title: resourceId,
        subtitle: "Vehicle record",
        href: `/admin/vehicles/${resourceId}`,
      };
    case AuditResourceType.Driver:
      return {
        title: resourceId,
        subtitle: "Driver record",
        href: `/admin/drivers/${resourceId}`,
      };
    case AuditResourceType.Depot:
      return getDepotDetails(resourceId);
    case AuditResourceType.Zone:
      return getZoneDetails(resourceId);
    case AuditResourceType.User:
      return getUserResourceDetails(resourceId);
    default:
      return null;
  }
}

async function getDepotDetails(
  resourceId: string,
): Promise<AuditResourceContext | null> {
  if (!isGuid(resourceId)) {
    return null;
  }

  const data = await gqlFetch<DepotLookupResponse>(GET_AUDIT_DEPOT, {
    id: resourceId,
  });

  if (!data.depot) {
    return null;
  }

  return {
    title: data.depot.name,
    subtitle: data.depot.isActive ? "Active depot" : "Inactive depot",
    href: "/admin/depots",
  };
}

async function getZoneDetails(
  resourceId: string,
): Promise<AuditResourceContext | null> {
  if (!isGuid(resourceId)) {
    return null;
  }

  const data = await gqlFetch<ZoneLookupResponse>(GET_AUDIT_ZONE, {
    id: resourceId,
  });

  if (!data.zone) {
    return null;
  }

  return {
    title: data.zone.name,
    subtitle: data.zone.depot?.name
      ? `${data.zone.isActive ? "Active" : "Inactive"} zone in ${data.zone.depot.name}`
      : data.zone.isActive
        ? "Active zone"
        : "Inactive zone",
    href: "/admin/zones",
  };
}

async function getUserResourceDetails(
  resourceId: string,
): Promise<AuditResourceContext | null> {
  if (!isGuid(resourceId)) {
    return null;
  }

  const data = await gqlFetch<UserLookupResponse>(GET_USER, { id: resourceId });

  if (!data.user) {
    return null;
  }

  const fullName = `${data.user.firstName} ${data.user.lastName}`.trim();

  return {
    title: fullName || data.user.email,
    subtitle: `${data.user.email} · ${data.user.role}`,
    href: "/admin/users",
  };
}

function isGuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
