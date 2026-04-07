"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { getImportHistoryAction, type ImportHistoryDto } from "@/lib/actions/parcelImport";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.06)" as const,
  text: "#e5e7eb" as const,
  muted: "#6b7280" as const,
  green: "#10b981" as const,
  red: "#ef4444" as const,
  yellow: "#f59e0b" as const,
};

const statusColors: Record<string, string> = {
  PreviewGenerated: S.yellow,
  Processing: S.yellow,
  Completed: S.green,
  Failed: S.red,
};

export default function ParcelImportHistoryPage() {
  const [history, setHistory] = useState<ImportHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getImportHistoryAction().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: S.bg }}>
      <TmNavbar />

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <Link
            href="/parcels"
            style={{ color: S.muted, textDecoration: "none", fontSize: "0.875rem" }}
          >
            ← Back to Parcels
          </Link>
          <h1 style={{ color: S.text, fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Import History
          </h1>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: S.muted }}>
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem",
            backgroundColor: S.panel,
            border: `1px solid ${S.border}`,
            borderRadius: "0.75rem",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
            <h2 style={{ color: S.text, marginBottom: "0.5rem" }}>No imports yet</h2>
            <p style={{ color: S.muted, marginBottom: "1.5rem" }}>
              Import history will appear here after you run your first bulk import.
            </p>
            <Link
              href="/parcels/import"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "#fff",
                borderRadius: "0.5rem",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              Go to Bulk Import
            </Link>
          </div>
        ) : (
          <div style={{
            backgroundColor: S.panel,
            border: `1px solid ${S.border}`,
            borderRadius: "0.75rem",
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>FILE</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>DATE</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>ROWS</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>VALID</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>INVALID</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>CREATED</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: S.muted, fontSize: "0.75rem", fontWeight: 500 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderTop: `1px solid ${S.border}` }}>
                    <td style={{ padding: "1rem", color: S.text, fontSize: "0.875rem" }}>
                      {item.fileName}
                    </td>
                    <td style={{ padding: "1rem", color: S.muted, fontSize: "0.875rem" }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", color: S.text, fontSize: "0.875rem" }}>
                      {item.totalRows}
                    </td>
                    <td style={{ padding: "1rem", color: S.green, fontSize: "0.875rem" }}>
                      {item.validRows}
                    </td>
                    <td style={{ padding: "1rem", color: item.invalidRows > 0 ? S.red : S.muted, fontSize: "0.875rem" }}>
                      {item.invalidRows}
                    </td>
                    <td style={{ padding: "1rem", color: S.text, fontSize: "0.875rem", fontWeight: 500 }}>
                      {item.parcelsCreated}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        backgroundColor: `${statusColors[item.status] || S.muted}20`,
                        color: statusColors[item.status] || S.muted,
                        border: `1px solid ${statusColors[item.status] || S.muted}40`,
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}