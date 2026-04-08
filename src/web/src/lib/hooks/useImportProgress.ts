"use client";

import { useEffect, useRef, useState } from "react";
import { createHubConnection } from "@/lib/signalr";

export interface ImportProgressPayload {
  importId: string;
  currentRow: number;
  totalRows: number;
  currentTrackingNumber: string;
  parcelsCreated: number;
  percentComplete: number;
}

export interface ImportCompletedPayload {
  importId: string;
  totalRows: number;
  parcelsCreated: number;
}

export function useImportProgress(importId: string | null) {
  const [progress, setProgress] = useState<ImportProgressPayload | null>(null);
  const [completed, setCompleted] = useState<ImportCompletedPayload | null>(null);
  const connectionRef = useRef<ReturnType<typeof createHubConnection> | null>(null);

  useEffect(() => {
    if (!importId) return;

    const connection = createHubConnection("/hubs/import-progress");

    connection.on("ImportProgress", (payload: ImportProgressPayload) => {
      setProgress(payload);
    });

    connection.on("ImportCompleted", (payload: ImportCompletedPayload) => {
      setCompleted(payload);
    });

    connection
      .start()
      .then(() => connection.invoke("JoinImport", importId))
      .catch(console.error);

    connectionRef.current = connection;

    return () => {
      connection
        .invoke("LeaveImport", importId)
        .catch(() => {});
      connection.stop();
      connectionRef.current = null;
    };
  }, [importId]);

  return { progress, completed };
}
