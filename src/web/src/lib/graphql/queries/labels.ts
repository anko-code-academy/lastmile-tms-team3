export const GET_PARCEL_LABEL = `
  query GetParcelLabel($id: UUID!) {
    parcelLabel(id: $id) {
      id
      trackingNumber
      barcodeData
      recipientName
      recipientAddress
      zoneName
      parcelType
      serviceType
      pdfBase64
    }
  }
`;

export const GET_PARCEL_LABEL_ZPL = `
  query GetParcelLabelZpl($id: UUID!) {
    parcelLabelZpl(id: $id)
  }
`;
