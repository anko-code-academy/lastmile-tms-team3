"use client";

import { useEffect, useRef } from "react";
import { HubConnection } from "@microsoft/signalr";
import { createHubConnection } from "@/lib/signalr";

export function useRouteUpdates(
  routeId: string | null,
  onRouteUpdated?: () => void
) {
  const connectionRef = useRef<HubConnection | null>(null);
  const callbackRef = useRef(onRouteUpdated);
  callbackRef.current = onRouteUpdated;

  useEffect(() => {
    if (!routeId) return;

    const connection = createHubConnection("/hubs/driver-location");
    connectionRef.current = connection;

    connection.on("RouteUpdated", () => {
      callbackRef.current?.();
    });

    connection.onreconnected(() => {
      connection.invoke("SubscribeRoutes", [routeId]).catch(console.error);
    });

    connection.start()
      .then(() => connection.invoke("SubscribeRoutes", [routeId]))
      .catch(console.error);

    return () => {
      connection.invoke("UnsubscribeRoutes", [routeId]).catch(() => {});
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);
}
