import { useState, useEffect, useRef } from "react";
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit";

const API_TOKEN = import.meta.env.VITE_SNAP_API_TOKEN;
const LENS_GROUP_ID = "7b0f21c4-a3d1-4422-9c94-89ba957f7d90";
const TARGET_LENS_ID = "a92f9841-1d83-4ecb-b44d-c3960fe3fa9c";

export default function StreetViewCamera() {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const lensesRef = useRef([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [activeLensIdx, setActiveLensIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const cameraKit = await bootstrapCameraKit({ apiToken: API_TOKEN });
        if (cancelled) return;

        const session = await cameraKit.createSession({
          liveRenderTarget: canvasRef.current,
        });
        sessionRef.current = session;

        session.events.addEventListener("error", (event) => {
          if (event.detail.error.name === "LensExecutionError") {
            console.error("Lens execution error:", event.detail.error);
          }
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
        });
        mediaStreamRef.current = stream;

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const source = createMediaStreamSource(stream, {
          transform: Transform2D.MirrorX,
          cameraType: "front",
        });

        await session.setSource(source);
        await session.play();

        const { lenses } = await cameraKit.lensRepository.loadLensGroups([LENS_GROUP_ID]);
        if (cancelled) return;

        lensesRef.current = lenses;

        const startIdx = lenses.findIndex((l) => l.id === TARGET_LENS_ID);
        const idx = startIdx >= 0 ? startIdx : 0;
        if (lenses[idx]) await session.applyLens(lenses[idx]);
        setActiveLensIdx(idx);

        setStatus("ready");
      } catch (err) {
        console.error("StreetViewCamera init error:", err);
        if (!cancelled) setStatus("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (sessionRef.current) {
        sessionRef.current.pause();
      }
    };
  }, []);

  async function handleTap() {
    const session = sessionRef.current;
    const lenses = lensesRef.current;
    if (!session || lenses.length === 0) return;

    const nextIdx = (activeLensIdx + 1) % lenses.length;
    await session.applyLens(lenses[nextIdx]);
    setActiveLensIdx(nextIdx);
  }

  return (
    <div
      onClick={status === "ready" ? handleTap : undefined}
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        width: 200,
        height: 356,
        borderRadius: 20,
        overflow: "hidden",
        border: "3px solid rgba(255,255,255,0.9)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
        zIndex: 20,
        background: "#000",
        cursor: status === "ready" ? "pointer" : "default",
        animation: "bereal-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
      }}
    >
      <style>{`
        @keyframes bereal-pop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          borderRadius: 17,
        }}
      />

      {/* "Tap to change filter" hint */}
      {status === "ready" && (
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          padding: "18px 8px 8px",
          background: "linear-gradient(to top, rgba(0,0,0,0.52) 0%, transparent 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          borderRadius: "0 0 17px 17px",
        }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(255,255,255,0.82)",
            letterSpacing: "0.03em",
          }}>
            tap to change filter
          </span>
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
          color: "white", gap: 6, borderRadius: 17,
        }}>
          <div style={{ fontSize: 22 }}>📷</div>
          <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.8 }}>Loading...</div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)",
          color: "rgba(255,255,255,0.6)", fontSize: 22, borderRadius: 17,
        }}>
          📷
        </div>
      )}
    </div>
  );
}
