"use client";

import { useEffect, useRef, useState } from "react";
import { HubConnection } from "@microsoft/signalr";
import { createHubConnection } from "@/lib/signalr";

export interface DriverPosition {
  lat: number;
  lng: number;
  timestamp: string;
}

export function useDriverPositions(routeIds: string[]) {
  const [positions, setPosition] = useState<Map<string, DriverPosition>>(new Map());
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    if (routeIds.length === 0) return;

    const connection = createHubConnection("/hubs/driver-location");
    connectionRef.current = connection;

    connection.on("DriverPositionChanged", (data: { routeId: string; latitude: number; longitude: number; timestamp: string }) => {
      setPosition(prev => {
        const next = new Map(prev);
        next.set(data.routeId, { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp });
        return next;
      });
    });

    // Re-subscribe after reconnect — server assigns new connection ID,
    // so all group memberships are lost on reconnect.
    connection.onreconnected(() => {
      connection.invoke("SubscribeRoutes", routeIds).catch(console.error);
    });

    connection.start()
      .then(() => connection.invoke("SubscribeRoutes", routeIds))
      .catch(console.error);

    return () => {
      connection.invoke("UnsubscribeRoutes", routeIds).catch(() => {});
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeIds.join(",")]);

  return positions;
}
