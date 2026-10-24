"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#071428", color: "#fff", minHeight: "100vh", display: "grid", placeItems: "center", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 480 }}>
          <h1 style={{ fontSize: 24 }}>PD FinPrep is temporarily unavailable</h1>
          <p style={{ color: "#c3d0e6" }}>Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, background: "#c9a227", color: "#071428", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
