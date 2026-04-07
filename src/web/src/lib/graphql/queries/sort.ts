export const SORT_PARCEL = `
  mutation SortParcel($input: SortParcelDtoInput!) {
    sortParcel(input: $input) {
      parcelId
      trackingNumber
      status
      zoneId
      zoneName
      isMissort
      isUnsortable
      trackingEvents {
        timestamp
        eventType
        operator
        locationCity
      }
    }
  }
`;

