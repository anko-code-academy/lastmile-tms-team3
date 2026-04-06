import { useQuery } from "@tanstack/react-query";
import {
  getAuditLogAction,
  searchAuditLogsAction,
} from "@/lib/actions/auditLogs";
import {
  DEFAULT_AUDIT_LOG_SORT_BY,
  DEFAULT_AUDIT_LOG_SORT_DIRECTION,
} from "@/lib/types/auditLog";
import type { SearchAuditLogsInput } from "@/lib/types/auditLog";

export function useSearchAuditLogs(input: SearchAuditLogsInput) {
  return useQuery({
    queryKey: ["auditLogs", "search", input],
    queryFn: () => searchAuditLogsAction(input),
  });
}

export function useRelatedAuditLogs(
  correlationId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["auditLogs", "related", correlationId],
    queryFn: () =>
      searchAuditLogsAction({
        actor: null,
        actionType: null,
        resourceType: null,
        resourceId: null,
        correlationId: correlationId ?? null,
        from: null,
        to: null,
        sortBy: DEFAULT_AUDIT_LOG_SORT_BY,
        sortDirection: DEFAULT_AUDIT_LOG_SORT_DIRECTION,
        cursor: null,
        pagingDirection: undefined,
        pageSize: 20,
      }),
    enabled: enabled && Boolean(correlationId),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ["auditLogs", "detail", id],
    queryFn: () => getAuditLogAction(id),
    enabled: Boolean(id),
  });
}
