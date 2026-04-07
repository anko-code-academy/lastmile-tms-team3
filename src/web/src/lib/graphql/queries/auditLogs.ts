const AUDIT_LOG_LIST_ITEM_FIELDS = `
  id
  occurredAt
  actorUserId
  actorUserName
  actionType
  resourceType
  resourceId
  correlationId
  summary
`;

const AUDIT_LOG_FIELDS = `
  ${AUDIT_LOG_LIST_ITEM_FIELDS}
  beforeValuesJson
  afterValuesJson
`;

export const GET_AUDIT_LOGS = `
  query GetAuditLogs(
    $actor: String
    $where: AuditLogFilterInput
    $order: [AuditLogSortInput!]
    $first: Int
    $after: String
    $last: Int
    $before: String
  ) {
    auditLogs(
      actor: $actor
      where: $where
      order: $order
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      nodes {
        ${AUDIT_LOG_LIST_ITEM_FIELDS}
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_AUDIT_LOG = `
  query GetAuditLog($id: UUID!) {
    auditLog(id: $id) {
      ${AUDIT_LOG_FIELDS}
    }
  }
`;
