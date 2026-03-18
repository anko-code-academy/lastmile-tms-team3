"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 110%; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.25; r: 4; }
          50%       { opacity: 1;    r: 6; }
        }
        @keyframes drawPath {
          from { stroke-dashoffset: 900; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes truckMove {
          0%   { offset-distance: 0%;   opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(245,158,11,0.3); }
          50%       { box-shadow: 0 0 24px rgba(245,158,11,0.6); }
        }

        .fu-0 { animation: fadeUp .55s .05s both ease; }
        .fu-1 { animation: fadeUp .55s .15s both ease; }
        .fu-2 { animation: fadeUp .55s .25s both ease; }
        .fu-3 { animation: fadeUp .55s .35s both ease; }
        .fu-4 { animation: fadeUp .55s .45s both ease; }
        .fu-5 { animation: fadeUp .55s .55s both ease; }

        .route-a {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: drawPath 2.8s .4s ease forwards;
        }
        .route-b {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: drawPath 2.8s .9s ease forwards;
        }
        .route-c {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: drawPath 2.8s 1.4s ease forwards;
        }

        .node { animation: pulseDot 2.4s ease-in-out infinite; }
        .node-b { animation: pulseDot 2.4s .8s ease-in-out infinite; }
        .node-c { animation: pulseDot 2.4s 1.6s ease-in-out infinite; }

        .scanline {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,.18) 50%, transparent 100%);
          animation: scanline 5s linear infinite;
          pointer-events: none;
        }

        .auth-field {
          width: 100%;
          padding: .75rem 1rem;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: .9rem;
          font-family: var(--font-geist-sans, system-ui);
          transition: border-color .2s, box-shadow .2s;
          outline: none;
        }
        .auth-field::placeholder { color: #3d4f6b; }
        .auth-field:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245,158,11,.12);
        }
        .auth-field[aria-invalid="true"] {
          border-color: rgba(239,68,68,.6);
        }

        .signin-btn {
          width: 100%; padding: .875rem 1.5rem;
          background: #f59e0b; color: #0b0f1a;
          border: none; border-radius: 8px; cursor: pointer;
          font-weight: 700; font-size: .875rem; letter-spacing: .08em;
          font-family: var(--font-geist-mono, monospace);
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          transition: background .2s, transform .1s;
          animation: glowPulse 3s ease-in-out infinite;
        }
        .signin-btn:hover:not(:disabled) {
          background: #fbbf24;
          transform: translateY(-1px);
        }
        .signin-btn:active:not(:disabled) { transform: translateY(0); }
        .signin-btn:disabled { opacity: .55; cursor: not-allowed; animation: none; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#080c14" }}>

        {/* ── Left panel: animated route map ── */}
        <div
          className="hidden lg:flex"
          style={{
            flex: 1,
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "3rem",
            position: "relative",
            overflow: "hidden",
            borderRight: "1px solid rgba(255,255,255,.05)",
            background: "linear-gradient(160deg, #0a0e1b 0%, #0d1424 60%, #080c14 100%)",
          }}
        >
          {/* Grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "linear-gradient(rgba(30,42,66,.6) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(30,42,66,.6) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }} />

          {/* Scanline sweep */}
          <div className="scanline" />

          {/* Route SVG */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            viewBox="0 0 640 760"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Route A — amber */}
            <polyline
              className="route-a"
              points="40,120 200,120 200,280 360,280 360,440 520,440 520,600"
              fill="none" stroke="#f59e0b" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Route B — dim amber */}
            <polyline
              className="route-b"
              points="120,680 120,440 280,440 280,200 480,200 480,80"
              fill="none" stroke="#d97706" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Route C — faint */}
            <polyline
              className="route-c"
              points="560,680 560,520 400,520 400,360 160,360 160,520 40,520"
              fill="none" stroke="#78350f" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Depot origin rings */}
            <circle cx="40"  cy="120" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity=".5" />
            <circle cx="520" cy="600" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity=".5" />

            {/* Delivery nodes — pulsing */}
            <circle className="node"   cx="200" cy="120" r="4" fill="#f59e0b" />
            <circle className="node-b" cx="360" cy="280" r="4" fill="#f59e0b" />
            <circle className="node-c" cx="200" cy="280" r="4" fill="#d97706" />
            <circle className="node"   cx="280" cy="440" r="4" fill="#f59e0b" />
            <circle className="node-b" cx="480" cy="200" r="4" fill="#d97706" />
            <circle className="node-c" cx="360" cy="520" r="4" fill="#d97706" />
            <circle className="node"   cx="520" cy="440" r="4" fill="#f59e0b" />

            {/* Subtle filled stops */}
            <circle cx="200" cy="280" r="9" fill="#f59e0b" fillOpacity=".08" />
            <circle cx="360" cy="280" r="9" fill="#f59e0b" fillOpacity=".08" />
            <circle cx="520" cy="440" r="9" fill="#f59e0b" fillOpacity=".08" />
          </svg>

          {/* Branding */}
          <div style={{ position: "relative", zIndex: 10 }}>
            <p style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "10px", letterSpacing: ".2em",
              color: "#f59e0b", textTransform: "uppercase", marginBottom: ".75rem",
            }}>
              Anko Software · 2026
            </p>
            <h1 style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "clamp(2.8rem, 4.5vw, 4.5rem)",
              fontWeight: 800, lineHeight: 1, letterSpacing: "-.03em",
              color: "#e2e8f0", marginBottom: "1rem",
            }}>
              LAST<br />
              <span style={{ color: "#f59e0b" }}>MILE</span><br />
              TMS
            </h1>
            <p style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: ".8rem", color: "#3d4f6b",
              lineHeight: 1.7, maxWidth: "280px", letterSpacing: ".02em",
            }}>
              Parcel registration · depot operations ·<br />
              route dispatch · driver delivery
            </p>

            {/* Live status row */}
            <div style={{ marginTop: "2rem", display: "flex", gap: "1.5rem" }}>
              {["DEPOT", "DISPATCH", "TRACKING"].map((label) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 6px #22c55e",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "10px", color: "#3d4f6b", letterSpacing: ".15em",
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right panel: login form ── */}
        <div style={{
          width: "100%", maxWidth: "460px",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "3rem 2.5rem",
          background: "#0b0f1a",
        }}>
          <div style={{ maxWidth: "360px", margin: "0 auto", width: "100%" }}>

            {/* Mobile logo */}
            <div className="fu-0 lg:hidden" style={{ marginBottom: "2rem" }}>
              <span style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "1.25rem", fontWeight: 800, color: "#e2e8f0",
              }}>
                LAST MILE <span style={{ color: "#f59e0b" }}>TMS</span>
              </span>
            </div>

            {/* Header */}
            <div className="fu-0" style={{ marginBottom: "2.5rem" }}>
              <p style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "10px", letterSpacing: ".2em",
                color: "#f59e0b", textTransform: "uppercase", marginBottom: ".5rem",
              }}>
                SECURE ACCESS
              </p>
              <h2 style={{
                fontSize: "1.75rem", fontWeight: 700,
                color: "#e2e8f0", letterSpacing: "-.03em", lineHeight: 1.15,
              }}>
                Sign in to<br />your workspace
              </h2>
              <p style={{ marginTop: ".5rem", color: "#3d4f6b", fontSize: ".875rem" }}>
                Operations dashboard · dispatcher UI
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              <div className="fu-1" style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label htmlFor="email" style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px", letterSpacing: ".15em",
                  color: "#4a5f7a", textTransform: "uppercase",
                }}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="operator@depot.local"
                  autoComplete="email"
                  className="auth-field"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "11px", color: "#ef4444",
                  }}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="fu-2" style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                <label htmlFor="password" style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: "10px", letterSpacing: ".15em",
                  color: "#4a5f7a", textTransform: "uppercase",
                }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="auth-field"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password && (
                  <p style={{
                    fontFamily: "var(--font-geist-mono, monospace)",
                    fontSize: "11px", color: "#ef4444",
                  }}>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="fu-3" style={{
                  padding: ".75rem 1rem",
                  background: "rgba(239,68,68,.07)",
                  border: "1px solid rgba(239,68,68,.25)",
                  borderRadius: "8px",
                  display: "flex", alignItems: "center", gap: ".625rem",
                }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="7.5" cy="7.5" r="6.5" stroke="#ef4444" strokeWidth="1.3" />
                    <path d="M7.5 4.5v3.5M7.5 10.5v.5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <span style={{ color: "#fca5a5", fontSize: ".85rem" }}>{error}</span>
                </div>
              )}

              <div className="fu-3">
                <button type="submit" disabled={isSubmitting} className="signin-btn">
                  {isSubmitting ? (
                    <>
                      <svg
                        width="15" height="15" viewBox="0 0 15 15" fill="none"
                        style={{ animation: "spin .8s linear infinite" }}
                      >
                        <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="2"
                          strokeDasharray="24" strokeDashoffset="8" strokeLinecap="round" />
                      </svg>
                      AUTHENTICATING…
                    </>
                  ) : (
                    <>
                      SIGN IN
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor"
                          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="fu-4" style={{
              marginTop: "2.5rem", paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255,255,255,.05)",
              textAlign: "center",
            }}>
              <p style={{
                fontFamily: "var(--font-geist-mono, monospace)",
                fontSize: "10px", color: "#1e2d42", letterSpacing: ".12em",
              }}>
                LAST MILE TMS · ANKO SOFTWARE · 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
