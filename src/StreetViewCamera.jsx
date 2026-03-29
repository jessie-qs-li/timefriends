import { useState, useEffect, useRef } from "react";
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit";

const API_TOKEN = import.meta.env.VITE_SNAP_API_TOKEN;

export default function StreetViewCamera() {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

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
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
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

  return (
    <div style={{
      position: "absolute",
      bottom: 20,
      left: 20,
      width: 200,
      height: 270,
      borderRadius: 20,
      overflow: "hidden",
      border: "3px solid rgba(255,255,255,0.9)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
      zIndex: 20,
      background: "#000",
      animation: "bereal-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.3s both",
    }}>
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
