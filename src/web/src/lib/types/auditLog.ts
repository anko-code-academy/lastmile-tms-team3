import type {
  PagedResult,
  PagingDirection,
  SortDirection,
} from "@/lib/types/parcel";

export enum AuditActionType {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
  StatusTransition = "STATUS_TRANSITION",
  Activate = "ACTIVATE",
  Deactivate = "DEACTIVATE",
  SystemEvent = "SYSTEM_EVENT",
}

export enum AuditResourceType {
  Parcel = "PARCEL",
  User = "USER",
  Vehicle = "VEHICLE",
  Depot = "DEPOT",
  Zone = "ZONE",
  Driver = "DRIVER",
  System = "SYSTEM",
}

export type AuditLogSortBy =
  | "OCCURRED_AT"
  | "ACTION_TYPE"
  | "RESOURCE_TYPE"
  | "ACTOR_USER_NAME";

export interface AuditLogListItem {
  id: string;
  occurredAt: string;
  actorUserId?: string;
  actorUserName?: string;
  actionType: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  correlationId?: string;
  summary?: string;
}

export interface AuditLogDetail extends AuditLogListItem {
  beforeValuesJson?: string;
  afterValuesJson?: string;
  actorDetails?: AuditUserContext | null;
  resourceDetails?: AuditResourceContext | null;
}

export interface AuditUserContext {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  href?: string;
}

export interface AuditResourceContext {
  title?: string;
  href?: string;
}

export type SearchAuditLogsResult = PagedResult<AuditLogListItem>;

export interface SearchAuditLogsInput {
  actor: string | null;
  actionType: AuditActionType | null;
  resourceType: AuditResourceType | null;
  resourceId: string | null;
  correlationId: string | null;
  from: string | null;
  to: string | null;
  sortBy: AuditLogSortBy;
  sortDirection: SortDirection;
  cursor: string | null;
  pagingDirection?: PagingDirection;
  pageSize: number;
}
