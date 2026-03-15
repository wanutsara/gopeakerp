"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Caught:", error);
  }, [error]);

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", backgroundColor: "#fffbeb", color: "#92400e", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>⚠️ Application Error (Railway Cloud)</h1>
      <p style={{ marginBottom: "20px" }}>A server-side component crashed during rendering.</p>
      
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", border: "1px solid #fcd34d", overflow: "auto" }}>
        <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>Error Message:</h3>
        <p style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#b45309" }}>{error.message || "Unknown Error"}</p>
        {error.digest && <p style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>Digest: {error.digest}</p>}
        
        <pre style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f8fafc", color: "#334155", borderRadius: "4px", fontSize: "12px" }}>
          {error.stack}
        </pre>
      </div>

      <button 
        onClick={() => reset()} 
        style={{ marginTop: "24px", padding: "10px 20px", backgroundColor: "#b45309", color: "white", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" }}
      >
        Try Again
      </button>
    </div>
  );
}
