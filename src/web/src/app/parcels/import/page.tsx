"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import TmNavbar from "@/components/TmNavbar";
import { previewImportAction, confirmImportAction, type ParcelImportPreviewDto } from "@/lib/actions/parcelImport";
import { useImportProgress } from "@/lib/hooks/useImportProgress";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#647a96" as const,
  green: "#22c55e" as const,
  red: "#ef4444" as const,
  button: "#f59e0b" as const,
};

type Step = "upload" | "preview" | "importing" | "complete";

export default function ParcelImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<ParcelImportPreviewDto | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string; trackingNumbers?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeImportId = step === "importing" && preview ? preview.importId : null;
  const { progress } = useImportProgress(activeImportId);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large. Maximum size is 10MB.");
      return;
    }

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".csv") && !ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setError("Unsupported file format. Please upload a CSV or XLSX file.");
      return;
    }

    const result = await previewImportAction(file);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setPreview(result);
    setStep("preview");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = useCallback(async () => {
    if (!preview) return;
    setStep("importing");

    const importResult = await confirmImportAction(preview.importId);

    if ("error" in importResult) {
      setError(importResult.error);
      setStep("preview");
      return;
    }

    setResult({
      success: true,
      message: `Successfully created ${importResult.parcelsCreated} parcels`,
      trackingNumbers: importResult.createdParcelTrackingNumbers,
    });
    setStep("complete");
  }, [preview]);

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setResult(null);
    setError(null);
  };

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
            Bulk Parcel Import
          </h1>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
          {["upload", "preview", "importing", "complete"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <div style={{ width: "2rem", height: "2px", backgroundColor: S.border, marginRight: "0.5rem" }} />}
              <div style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor: step === s ? S.button : S.panel,
                color: step === s ? "#fff" : S.muted,
                border: `1px solid ${step === s ? S.button : S.border}`,
              }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            padding: "1rem",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: `1px solid ${S.red}`,
            borderRadius: "0.5rem",
            color: S.red,
            marginBottom: "1.5rem",
          }}>
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? S.button : S.border}`,
              borderRadius: "0.75rem",
              padding: "4rem 2rem",
              textAlign: "center",
              backgroundColor: S.panel,
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📁</div>
            <h2 style={{ color: S.text, fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              Drag and drop your CSV or XLSX file
            </h2>
            <p style={{ color: S.muted, marginBottom: "1.5rem" }}>
              or click to browse
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: "none" }}
              id="file-input"
            />
            <label
              htmlFor="file-input"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: S.button,
                color: "#fff",
                borderRadius: "0.5rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Select File
            </label>

            <p style={{ marginTop: "1.5rem", color: S.muted, fontSize: "0.875rem" }}>
              Supported formats: CSV, XLSX
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && preview && (
          <div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}>
              <div>
                <h2 style={{ color: S.text, margin: 0 }}>
                  Preview: {preview.fileName}
                </h2>
                <p style={{ color: S.muted, margin: "0.5rem 0 0" }}>
                  {preview.totalRows} total rows • {preview.validRows} valid • {preview.invalidRows} invalid
                </p>
              </div>
              <button
                onClick={handleReset}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: S.muted,
                  border: `1px solid ${S.border}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ padding: "1rem", backgroundColor: S.panel, borderRadius: "0.5rem", border: `1px solid ${S.border}` }}>
                <div style={{ color: S.muted, fontSize: "0.75rem", marginBottom: "0.5rem" }}>TOTAL ROWS</div>
                <div style={{ color: S.text, fontSize: "1.5rem", fontWeight: 600 }}>{preview.totalRows}</div>
              </div>
              <div style={{ padding: "1rem", backgroundColor: S.panel, borderRadius: "0.5rem", border: `1px solid ${S.border}` }}>
                <div style={{ color: S.green, fontSize: "0.75rem", marginBottom: "0.5rem" }}>VALID</div>
                <div style={{ color: S.green, fontSize: "1.5rem", fontWeight: 600 }}>{preview.validRows}</div>
              </div>
              <div style={{ padding: "1rem", backgroundColor: S.panel, borderRadius: "0.5rem", border: `1px solid ${S.border}` }}>
                <div style={{ color: S.red, fontSize: "0.75rem", marginBottom: "0.5rem" }}>INVALID</div>
                <div style={{ color: S.red, fontSize: "1.5rem", fontWeight: 600 }}>{preview.invalidRows}</div>
              </div>
            </div>

            {/* Preview table */}
            <div style={{
              backgroundColor: S.panel,
              border: `1px solid ${S.border}`,
              borderRadius: "0.5rem",
              overflow: "hidden",
              maxHeight: "400px",
              overflowY: "auto",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "rgba(0,0,0,0.2)", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: S.muted, fontWeight: 500 }}>#</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: S.muted, fontWeight: 500 }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: S.muted, fontWeight: 500 }}>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} style={{ borderTop: `1px solid ${S.border}` }}>
                      <td style={{ padding: "0.75rem 1rem", color: S.muted }}>{row.rowNumber}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {row.isValid ? (
                          <span style={{ color: S.green }}>✓ Valid</span>
                        ) : (
                          <span style={{ color: S.red }}>✗ Invalid</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: row.isValid ? S.muted : S.red }}>
                        {row.errors.join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              {preview.invalidRows > 0 && (
                <button
                  onClick={handleReset}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "transparent",
                    color: S.text,
                    border: `1px solid ${S.border}`,
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  Fix Errors & Re-upload
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={preview.validRows === 0}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: preview.validRows > 0 ? S.button : S.muted,
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: preview.validRows > 0 ? "pointer" : "not-allowed",
                  fontWeight: 500,
                }}
              >
                Import {preview.validRows} Valid Rows
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <h2 style={{ color: S.text, fontSize: "1.25rem", marginBottom: "1.5rem" }}>
              Importing parcels...
            </h2>
            {/* Progress bar */}
            <div style={{
              width: "100%",
              maxWidth: "500px",
              margin: "0 auto 1.5rem",
              height: "10px",
              backgroundColor: S.panel,
              borderRadius: "5px",
              overflow: "hidden",
              border: `1px solid ${S.border}`,
            }}>
              <div style={{
                width: `${progress?.percentComplete ?? 0}%`,
                height: "100%",
                backgroundColor: S.button,
                transition: "width 0.3s ease",
                borderRadius: "5px",
              }} />
            </div>
            <p style={{ color: S.muted, marginBottom: "0.5rem" }}>
              {progress
                ? `${progress.currentRow} of ${progress.totalRows} rows processed`
                : "Starting import..."}
            </p>
            {progress?.currentTrackingNumber && (
              <p style={{ color: S.muted, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                Creating: {progress.currentTrackingNumber}
              </p>
            )}
            {progress && (
              <p style={{ color: S.green, fontSize: "0.875rem" }}>
                {progress.parcelsCreated} parcels created
              </p>
            )}
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && result && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ color: S.text, fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              Import Complete!
            </h2>
            <p style={{ color: S.green, fontSize: "1.125rem", marginBottom: "1.5rem" }}>
              {result.message}
            </p>

            {result.trackingNumbers && result.trackingNumbers.length > 0 && (
              <div style={{
                backgroundColor: S.panel,
                border: `1px solid ${S.border}`,
                borderRadius: "0.5rem",
                padding: "1rem",
                textAlign: "left",
                marginBottom: "1.5rem",
                maxWidth: "500px",
                margin: "0 auto 1.5rem",
              }}>
                <div style={{ color: S.muted, fontSize: "0.75rem", marginBottom: "0.5rem" }}>
                  CREATED TRACKING NUMBERS
                </div>
                <div style={{ color: S.text, fontFamily: "monospace", fontSize: "0.875rem" }}>
                  {result.trackingNumbers.slice(0, 10).join(", ")}
                  {result.trackingNumbers.length > 10 && ` ...and ${result.trackingNumbers.length - 10} more`}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link
                href="/parcels"
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: S.button,
                  color: "#fff",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                View Parcels
              </Link>
              <button
                onClick={handleReset}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "transparent",
                  color: S.text,
                  border: `1px solid ${S.border}`,
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                }}
              >
                Import More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}