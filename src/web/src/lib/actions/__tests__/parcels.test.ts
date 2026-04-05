import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParcelStatus, ParcelSortBy, SortDirection } from "@/lib/types/parcel";
import type { Parcel, ParcelListItem } from "@/lib/types/parcel";

const mockGqlFetch = vi.fn();

vi.mock("@/lib/graphql/fetch", () => ({
  gqlFetch: (...args: unknown[]) => mockGqlFetch(...args),
}));

import { searchParcelsAction, getParcelAction } from "@/lib/actions/parcels";

function createMockParcelListItem(
  overrides: Partial<ParcelListItem> = {},
): ParcelListItem {
  return {
    id: "parcel-1",
    trackingNumber: "TRK001",
    serviceType: "STANDARD",
    status: ParcelStatus.Registered,
    recipientName: "John Doe",
    recipientCity: "New York",
    weight: 5,
    weightUnit: "KG",
    declaredValue: 100,
    currency: "USD",
    contentItemsCount: 2,
    createdAt: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

function createMockParcel(overrides: Partial<Parcel> = {}): Parcel {
  return {
    id: "parcel-1",
    trackingNumber: "TRK001",
    serviceType: "STANDARD",
    status: ParcelStatus.Registered,
    recipientAddress: {
      street1: "123 Main St",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      countryCode: "US",
      isResidential: true,
    },
    shipperAddress: {
      street1: "456 Sender Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      countryCode: "US",
      isResidential: false,
    },
    weight: 5,
    weightUnit: "KG",
    length: 30,
    width: 20,
    height: 10,
    dimensionUnit: "CM",
    declaredValue: 100,
    currency: "USD",
    deliveryAttempts: 0,
    contentItems: [],
    watchers: [],
    createdAt: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

function createMockParcelConnection(items: ParcelListItem[] = []) {
  return {
    parcels: {
      nodes: items.map((item) => ({
        id: item.id,
        trackingNumber: item.trackingNumber,
        description: item.description ?? null,
        serviceType: item.serviceType,
        status: item.status,
        recipientAddress: {
          contactName: item.recipientName,
          companyName: null,
          city: item.recipientCity,
        },
        zone: item.zoneName ? { name: item.zoneName } : null,
        parcelType: item.parcelType ?? null,
        weight: item.weight,
        weightUnit: item.weightUnit,
        declaredValue: item.declaredValue,
        currency: item.currency,
        estimatedDeliveryDate: item.estimatedDeliveryDate ?? null,
        contentItemsCount: item.contentItemsCount,
        createdAt: item.createdAt,
      })),
      totalCount: items.length,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: items[0]?.id ?? null,
        endCursor: items.at(-1)?.id ?? null,
      },
    },
  };
}

describe("parcel server actions", () => {
  beforeEach(() => {
    mockGqlFetch.mockReset();
  });

  describe("searchParcelsAction", () => {
    it("appends T00:00:00Z to dateFrom when provided", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: "2024-01-01",
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.CreatedAt,
        sortDirection: SortDirection.Desc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: "2024-01-01T00:00:00Z",
            }),
          }),
        }),
      );
    });

    it("appends T23:59:59Z to dateTo when provided", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: "2024-01-31",
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.CreatedAt,
        sortDirection: SortDirection.Desc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: "2024-01-31T23:59:59Z",
            }),
          }),
        }),
      );
    });

    it("passes null for dateFrom and dateTo when not provided", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.CreatedAt,
        sortDirection: SortDirection.Desc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          where: null,
        }),
      );
    });

    it("returns paged result with items on success", async () => {
      const items = [
        createMockParcelListItem({ id: "1", trackingNumber: "TRK001" }),
        createMockParcelListItem({ id: "2", trackingNumber: "TRK002" }),
      ];
      mockGqlFetch.mockResolvedValue(createMockParcelConnection(items));

      const result = await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.CreatedAt,
        sortDirection: SortDirection.Desc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it("builds backward paging variables when using a previous cursor", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.CreatedAt,
        sortDirection: SortDirection.Desc,
        cursor: "cursor-1",
        pagingDirection: "backward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          first: null,
          last: 20,
          before: "cursor-1",
          after: null,
        }),
      );
    });

    it("builds tracking-number order variables when requested", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.TrackingNumber,
        sortDirection: SortDirection.Asc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          order: [{ trackingNumber: "ASC" }],
        }),
      );
    });

    it("builds status order variables when requested", async () => {
      mockGqlFetch.mockResolvedValue(createMockParcelConnection());

      await searchParcelsAction({
        search: null,
        status: null,
        dateFrom: null,
        dateTo: null,
        zoneIds: null,
        parcelType: null,
        sortBy: ParcelSortBy.Status,
        sortDirection: SortDirection.Desc,
        cursor: null,
        pagingDirection: "forward",
        pageSize: 20,
      });

      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          order: [{ status: "DESC" }],
        }),
      );
    });
  });

  describe("getParcelAction", () => {
    it("returns parcel when found", async () => {
      const parcel = createMockParcel({
        id: "parcel-123",
        trackingNumber: "TRK999",
      });
      mockGqlFetch.mockResolvedValue({ parcel });

      const result = await getParcelAction("parcel-123");

      expect(result.trackingNumber).toBe("TRK999");
      expect(mockGqlFetch).toHaveBeenCalledWith(expect.any(String), {
        id: "parcel-123",
      });
    });

    it("throws when parcel is not found", async () => {
      mockGqlFetch.mockResolvedValue({ parcel: null });

      await expect(getParcelAction("non-existent-id")).rejects.toThrow(
        "Parcel with ID non-existent-id not found",
      );
    });
  });
});
