export const GET_DEPOT_DASHBOARD = `
  query GetDepotDashboard($id: UUID!, $agingThresholdHours: Int!) {
    depot(id: $id) {
      id
      name
      parcelDashboard(agingThresholdHours: $agingThresholdHours) {
        statusCounts {
          status
          count
        }
        zoneBreakdown {
          zoneId
          zoneName
          count
          statusCounts {
            status
            count
          }
          agingStatusCounts {
            status
            count
          }
        }
        agingAlerts {
          totalCount
          statusCounts {
            status
            count
          }
        }
        lastUpdatedAt
      }
    }
  }
`;

export const GET_DEPOT_DASHBOARDS = `
  query GetDepotDashboards($agingThresholdHours: Int!, $includeInactive: Boolean) {
    depots(includeInactive: $includeInactive) {
      id
      name
      parcelDashboard(agingThresholdHours: $agingThresholdHours) {
        statusCounts {
          status
          count
        }
        zoneBreakdown {
          zoneId
          zoneName
          count
          statusCounts {
            status
            count
          }
          agingStatusCounts {
            status
            count
          }
        }
        agingAlerts {
          totalCount
          statusCounts {
            status
            count
          }
        }
        lastUpdatedAt
      }
    }
  }
`;
