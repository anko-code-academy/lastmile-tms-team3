declare module "@mapbox/mapbox-gl-draw" {
  import type { Map } from "mapbox-gl";

  export interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    defaultMode?: string;
    styles?: object[];
    modes?: object;
    userProperties?: boolean;
  }

  export interface DrawFeature {
    id: string;
    type: "Feature";
    geometry: {
      type: "Polygon" | "LineString" | "Point";
      coordinates: number[] | number[][] | number[][][];
    };
    properties: Record<string, unknown>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default class MapboxDraw {
    constructor(options?: DrawOptions);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    add(geojson: object): string[];
    get(featureId: string): DrawFeature | undefined;
    getAll(): { type: "FeatureCollection"; features: DrawFeature[] };
    delete(ids: string | string[]): this;
    deleteAll(): this;
    set(featureCollection: object): string[];
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
    getMode(): string;
    changeMode(mode: string, options?: object): this;
    setFeatureProperty(featureId: string, property: string, value: unknown): this;
  }
}
