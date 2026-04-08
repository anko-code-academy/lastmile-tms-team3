import { graphql } from "./graphql";
import {
  AisleMutationDto,
  BinMutationDto,
  CreateAisleDto,
  CreateBinDto,
  UpdateAisleDto,
  UpdateBinDto,
  WarehouseDepotDto,
} from "../types/warehouse";

type AisleQueryRow = {
  aisleId: string;
  aisleName: string;
  code: string;
  sortOrder: number;
  currentParcelCount: number;
  canEdit: boolean;
  canDelete: boolean;
  canDeactivate: boolean;
  isActive: boolean;
  zone: {
    zoneId: string;
    zoneName: string;
    isActive: boolean;
    depot: {
      depotId: string;
      depotName: string;
    };
  };
  bins: Array<{
    id: string;
    name: string;
    code: string;
    labelCode: string;
    capacityParcelCount: number;
    currentParcelCount: number;
    utilizationPercent: number;
    canEdit: boolean;
    canDelete: boolean;
    canDeactivate: boolean;
    isActive: boolean;
    notes?: string | null;
  }>;
};

const AISLES_QUERY = `
  query GetAisles($depotId: UUID) {
    aisles(depotId: $depotId) {
      aisleId: id
      aisleName: name
      code
      sortOrder
      currentParcelCount
      canEdit
      canDelete
      canDeactivate
      isActive
      zone {
        zoneId: id
        zoneName: name
        isActive
        depot {
          depotId: id
          depotName: name
        }
      }
      bins {
        id
        name
        code
        labelCode
        capacityParcelCount
        currentParcelCount
        utilizationPercent
        canEdit
        canDelete
        canDeactivate
        isActive
        notes
      }
    }
  }
`;

const CREATE_AISLE_MUTATION = `
  mutation CreateAisle($input: CreateAisleDtoInput!) {
    createAisle(input: $input) {
      id
      zoneId
      name
      code
      sortOrder
      isActive
      notes
    }
  }
`;

const UPDATE_AISLE_MUTATION = `
  mutation UpdateAisle($input: UpdateAisleDtoInput!) {
    updateAisle(input: $input) {
      id
      zoneId
      name
      code
      sortOrder
      isActive
      notes
    }
  }
`;

const CREATE_BIN_MUTATION = `
  mutation CreateBin($input: CreateBinDtoInput!) {
    createBin(input: $input) {
      id
      aisleId
      name
      code
      labelCode
      capacityParcelCount
      currentParcelCount
      utilizationPercent
      isActive
      notes
    }
  }
`;

const UPDATE_BIN_MUTATION = `
  mutation UpdateBin($input: UpdateBinDtoInput!) {
    updateBin(input: $input) {
      id
      aisleId
      name
      code
      labelCode
      capacityParcelCount
      currentParcelCount
      utilizationPercent
      isActive
      notes
    }
  }
`;

const DELETE_AISLE_MUTATION = `
  mutation DeleteAisle($id: UUID!) {
    deleteAisle(id: $id)
  }
`;

const DELETE_BIN_MUTATION = `
  mutation DeleteBin($id: UUID!) {
    deleteBin(id: $id)
  }
`;

export async function getWarehouseBins(
  depotId?: string,
): Promise<WarehouseDepotDto[]> {
  const data = await graphql<{ aisles: AisleQueryRow[] }>(AISLES_QUERY, {
    depotId: depotId || null,
  });

  const depots = new Map<string, WarehouseDepotDto>();

  for (const aisle of data.aisles) {
    const depotIdValue = aisle.zone.depot.depotId;
    const zoneIdValue = aisle.zone.zoneId;

    let depot = depots.get(depotIdValue);
    if (!depot) {
      depot = {
        depotId: depotIdValue,
        depotName: aisle.zone.depot.depotName,
        zones: [],
      };
      depots.set(depotIdValue, depot);
    }

    let zone = depot.zones.find((item) => item.zoneId === zoneIdValue);
    if (!zone) {
      zone = {
        zoneId: zoneIdValue,
        zoneName: aisle.zone.zoneName,
        isActive: aisle.zone.isActive,
        aisles: [],
      };
      depot.zones.push(zone);
    }

    zone.aisles.push({
      aisleId: aisle.aisleId,
      aisleName: aisle.aisleName,
      code: aisle.code,
      sortOrder: aisle.sortOrder,
      currentParcelCount: aisle.currentParcelCount,
      canEdit: aisle.canEdit,
      canDelete: aisle.canDelete,
      canDeactivate: aisle.canDeactivate,
      isActive: aisle.isActive,
      bins: aisle.bins.map((bin) => ({
        id: bin.id,
        name: bin.name,
        code: bin.code,
        labelCode: bin.labelCode,
        capacityParcelCount: bin.capacityParcelCount,
        currentParcelCount: bin.currentParcelCount,
        utilizationPercent: bin.utilizationPercent,
        canEdit: bin.canEdit,
        canDelete: bin.canDelete,
        canDeactivate: bin.canDeactivate,
        isActive: bin.isActive,
        notes: bin.notes,
      })),
    });
  }

  return Array.from(depots.values()).map((depot) => ({
    ...depot,
    zones: depot.zones
      .map((zone) => ({
        ...zone,
        aisles: zone.aisles.sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.code.localeCompare(right.code),
        ),
      }))
      .sort((left, right) => left.zoneName.localeCompare(right.zoneName)),
  }));
}

export async function createAisle(
  dto: CreateAisleDto,
): Promise<AisleMutationDto> {
  const data = await graphql<{ createAisle: AisleMutationDto }>(
    CREATE_AISLE_MUTATION,
    {
      input: dto,
    },
  );

  return data.createAisle;
}

export async function updateAisle(
  dto: UpdateAisleDto,
): Promise<AisleMutationDto> {
  const data = await graphql<{ updateAisle: AisleMutationDto }>(
    UPDATE_AISLE_MUTATION,
    {
      input: dto,
    },
  );

  return data.updateAisle;
}

export async function createBin(dto: CreateBinDto): Promise<BinMutationDto> {
  const data = await graphql<{ createBin: BinMutationDto }>(
    CREATE_BIN_MUTATION,
    {
      input: dto,
    },
  );

  return data.createBin;
}

export async function updateBin(dto: UpdateBinDto): Promise<BinMutationDto> {
  const data = await graphql<{ updateBin: BinMutationDto }>(
    UPDATE_BIN_MUTATION,
    {
      input: dto,
    },
  );

  return data.updateBin;
}

export async function deleteAisle(id: string): Promise<boolean> {
  const data = await graphql<{ deleteAisle: boolean }>(DELETE_AISLE_MUTATION, {
    id,
  });

  return data.deleteAisle;
}

export async function deleteBin(id: string): Promise<boolean> {
  const data = await graphql<{ deleteBin: boolean }>(DELETE_BIN_MUTATION, {
    id,
  });

  return data.deleteBin;
}
