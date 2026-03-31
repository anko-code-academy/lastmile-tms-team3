export const SEARCH_PARCELS = `
  query SearchParcels($input: SearchParcelDtoInput!) {
    searchParcels(input: $input) {
      items {
        id
        trackingNumber
        description
        serviceType
        status
        recipientName
        recipientCity
        zoneName
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
      hasNextPage
      hasPreviousPage
      nextCursor
      previousCursor
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
        latitude
        longitude
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
        latitude
        longitude
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
      zoneName
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
        deliveryLocation
        signatureImage
        photo
        deliveredAt
        latitude
        longitude
      }
    }
  }
`;
