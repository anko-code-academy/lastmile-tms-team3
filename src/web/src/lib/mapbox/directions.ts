const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// In-memory cache: route geometry is deterministic for given coordinates
const routeCache = new Map<string, [number, number][]>();

// Throttle: max 5 concurrent requests, 250ms between dispatches
let activeRequests = 0;
const pendingQueue: Array<() => void> = [];

async function throttle<T>(fn: () => Promise<T>): Promise<T> {
  if (activeRequests >= 5) {
    await new Promise<void>((resolve) => pendingQueue.push(resolve));
  }
  activeRequests++;
  try {
    return await fn();
  } finally {
    activeRequests--;
    const next = pendingQueue.shift();
    if (next) setTimeout(next, 250);
  }
}

function cacheKey(waypoints: [number, number][]): string {
  return waypoints
    .map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
    .join(";");
}

async function callDirectionsApi(
  waypoints: [number, number][]
): Promise<[number, number][]> {
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?access_token=${MAPBOX_TOKEN}&overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions API ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(`Directions API code: ${data.code}`);
  }
  return data.routes[0].geometry.coordinates as [number, number][];
}

/**
 * Takes an array of [lng, lat] waypoints, returns road-following coordinates.
 * Falls back to the input coordinates (straight line) on any failure.
 */
export async function fetchRoutePath(
  waypoints: [number, number][]
): Promise<[number, number][]> {
  if (waypoints.length < 2) return waypoints;

  const key = cacheKey(waypoints);
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const roadCoords = await throttle(() => callDirectionsApi(waypoints));
    routeCache.set(key, roadCoords);
    return roadCoords;
  } catch (err) {
    console.warn("Mapbox Directions fallback to straight line:", err);
    routeCache.set(key, waypoints);
    return waypoints;
  }
}

/**
 * Convenience wrapper: builds depot → sorted stops → depot waypoints,
 * then calls fetchRoutePath.
 */
export async function fetchRoundTripPath(options: {
  depot: { latitude: number; longitude: number } | null;
  stops: { latitude: number; longitude: number; stopOrder: number }[];
}): Promise<[number, number][]> {
  const waypoints: [number, number][] = [];

  if (options.depot) {
    waypoints.push([options.depot.longitude, options.depot.latitude]);
  }

  const sorted = [...options.stops].sort((a, b) => a.stopOrder - b.stopOrder);
  sorted.forEach((s) => {
    waypoints.push([s.longitude, s.latitude]);
  });

  if (options.depot && waypoints.length > 1) {
    waypoints.push([options.depot.longitude, options.depot.latitude]);
  }

  return fetchRoutePath(waypoints);
}
