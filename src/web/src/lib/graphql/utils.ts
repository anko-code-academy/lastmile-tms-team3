// Parses WKT POINT string like "POINT (longitude latitude)" into { latitude, longitude }
export function parseWktPoint(wkt: string | null): { latitude: number; longitude: number } | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\s*\(\s*([^\s]+)\s+([^\s]+)\s*\)/i);
  if (!match) return null;
  return {
    longitude: parseFloat(match[1]),
    latitude: parseFloat(match[2]),
  };
}
