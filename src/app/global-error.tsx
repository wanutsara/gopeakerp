"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: "#fef2f2", color: "#991b1b", minHeight: "100vh" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>🔥 Fatal System Error (Railway Cloud)</h1>
          <p style={{ marginBottom: "20px" }}>The application encountered an uncaught exception on the server.</p>
          
          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #fca5a5", overflow: "auto" }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>Error Details:</h3>
            <p style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "bold" }}>{error.message || "Unknown Error"}</p>
            {error.digest && <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>Digest: {error.digest}</p>}
            
            <pre style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f8fafc", color: "#334155", borderRadius: "4px", fontSize: "12px" }}>
              {error.stack}
            </pre>
          </div>

          <button 
            onClick={() => reset()} 
            style={{ marginTop: "24px", padding: "10px 20px", backgroundColor: "#991b1b", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}
          >
            Attempt Recovery (Reset)
          </button>
        </div>
      </body>
    </html>
  );
}
