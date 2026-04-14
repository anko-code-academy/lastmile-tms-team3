export const EDIT_PARCEL = `
  mutation EditParcel($input: EditParcelDtoInput!) {
    editParcel(input: $input) {
      id
      trackingNumber
      status
      description
      weight
      weightUnit
      length
      width
      height
      dimensionUnit
      declaredValue
      currency
      parcelType
      notes
      estimatedDeliveryDate
      lastModifiedAt
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
      }
      changeHistory {
        id
        occurredAt
        actorUserName
        actionType
        summary
        beforeValuesJson
        afterValuesJson
      }
    }
  }
`;

export const CANCEL_PARCEL = `
  mutation CancelParcel($input: CancelParcelDtoInput!) {
    cancelParcel(input: $input) {
      id
      trackingNumber
      status
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
        createdAt
      }
      changeHistory {
        id
        occurredAt
        actorUserName
        actionType
        summary
      }
    }
  }
`;

export const CREATE_PARCEL = `
  mutation CreateParcel($input: CreateParcelDtoInput!) {
    createParcel(input: $input) {
      id
      trackingNumber
      barcodeData
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
      parcelType
      notes
      zoneId
      zoneName
      createdAt
    }
  }
`;

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
          depot {
            name
          }
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
      barcodeData
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
      notes
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
      routeId
      route {
        name
        id
      }
      changeHistory {
        id
        occurredAt
        actorUserName
        actionType
        summary
        beforeValuesJson
        afterValuesJson
      }
    }
  }
`;
