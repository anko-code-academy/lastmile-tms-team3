import { useQuery } from "@tanstack/react-query";
import {
  getAuditLogAction,
  searchAuditLogsAction,
} from "@/lib/actions/auditLogs";
import type { SearchAuditLogsInput } from "@/lib/types/auditLog";

export function useSearchAuditLogs(input: SearchAuditLogsInput) {
  return useQuery({
    queryKey: ["auditLogs", "search", input],
    queryFn: () => searchAuditLogsAction(input),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ["auditLogs", "detail", id],
    queryFn: () => getAuditLogAction(id),
    enabled: Boolean(id),
  });
}
