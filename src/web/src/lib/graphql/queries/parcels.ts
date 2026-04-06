export const SEARCH_PARCELS = `
  query SearchParcels(
    $first: Int
    $last: Int
    $after: String
    $before: String
    $search: String
    $where: ParcelFilterInput
    $order: [ParcelSortInput!]
  ) {
    parcels(
      first: $first
      last: $last
      after: $after
      before: $before
      search: $search
      where: $where
      order: $order
    ) {
      nodes {
        id
        trackingNumber
        description
        serviceType
        status
        recipientAddress {
          contactName
          companyName
          city
        }
        zone {
          name
        }
        parcelType
        weight
        weightUnit
        declaredValue
        currency
        estimatedDeliveryDate
        contentItemsCount
        createdAt
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_PARCEL = `
  query GetParcel($id: UUID!) {
    parcel(id: $id) {
      id
      trackingNumber
      description
      serviceType
      status
      recipientAddress {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        geoLocation
      }
      shipperAddress {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        geoLocation
      }
      weight
      weightUnit
      length
      width
      height
      dimensionUnit
      declaredValue
      currency
      estimatedDeliveryDate
      actualDeliveryDate
      deliveryAttempts
      parcelType
      zoneId
      zone {
        name
      }
      createdAt
      lastModifiedAt
      trackingEvents {
        id
        timestamp
        eventType
        description
        locationCity
        locationState
        locationCountryCode
        operator
        delayReason
        createdAt
      }
      contentItems {
        id
        hsCode
        description
        quantity
        unitValue
        currency
        weight
        weightUnit
        originCountryCode
      }
      watchers {
        id
        email
        name
      }
      deliveryConfirmation {
        id
        receivedBy
        location
        signatureImage
        photo
        deliveredAt
        geoLocation
      }
    }
  }
`;
