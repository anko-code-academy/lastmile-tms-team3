import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGqlFetch = vi.fn();

vi.mock("@/lib/graphql/fetch", () => ({
  gqlFetch: (...args: unknown[]) => mockGqlFetch(...args),
}));

import { getDriverAction, searchDriversAction } from "@/lib/actions/drivers";

describe("driver server actions", () => {
  beforeEach(() => {
    mockGqlFetch.mockReset();
  });

  it("sends search, where and order variables", async () => {
    mockGqlFetch.mockResolvedValue({
      drivers: {
        nodes: [
          {
            id: "driver-1",
            firstName: "Alice",
            lastName: "Zephyr",
            email: "alice@example.com",
            licenseNumber: "DL123456",
            depot: { name: "Main Depot" },
            isActive: true,
            createdAt: "2024-01-15T00:00:00Z",
          },
        ],
        totalCount: 1,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    });

    const result = await searchDriversAction({
      search: "alice",
      isActive: true,
      sortField: "fullName",
      sortDirection: "ASC",
      first: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.fullName).toBe("Alice Zephyr");
    expect(mockGqlFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        search: "alice",
        where: {
          isActive: { eq: true },
        },
        order: [{ firstName: "ASC" }, { lastName: "ASC" }],
        first: 20,
      }),
    );
  });

  it("normalizes empty search and empty filters to null", async () => {
    mockGqlFetch.mockResolvedValue({
      drivers: {
        nodes: [],
        totalCount: 0,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    });

    await searchDriversAction({
      search: "   ",
      sortField: "createdAt",
      sortDirection: "DESC",
    });

    expect(mockGqlFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        search: null,
        where: null,
        order: [{ createdAt: "DESC" }],
      }),
    );
  });

  it("derives fullName for driver detail responses", async () => {
    mockGqlFetch.mockResolvedValue({
      driver: {
        id: "driver-1",
        firstName: "Alice",
        lastName: "Zephyr",
        phone: "+1111111111",
        email: "alice@example.com",
        licenseNumber: "DL123456",
        licenseExpiryDate: "2027-01-01",
        depotId: "depot-1",
        depot: { name: "Main Depot" },
        userId: null,
        isActive: true,
        availability: { schedule: [], daysOff: [] },
        createdAt: "2024-01-15T00:00:00Z",
        lastModifiedAt: null,
      },
    });

    const result = await getDriverAction("driver-1");

    expect(result?.fullName).toBe("Alice Zephyr");
    expect(mockGqlFetch).toHaveBeenCalledWith(expect.anything(), {
      id: "driver-1",
    });
  });
});
