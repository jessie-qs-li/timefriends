import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit";

const API_TOKEN = import.meta.env.VITE_SNAP_API_TOKEN;
const LENS_GROUP_ID = import.meta.env.VITE_SNAP_LENS_GROUP_ID;

export default function CameraOverlay({ onClose }) {
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [lenses, setLenses] = useState([]);
  const [activeLensIndex, setActiveLensIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize Camera Kit
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
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
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

        // Load all lenses from the group
        const { lenses: groupLenses } = await cameraKit.lensRepository.loadLensGroups([LENS_GROUP_ID]);

        if (cancelled) return;

        setLenses(groupLenses);
        setActiveLensIndex(groupLenses.length > 0 ? 0 : -1);

        // Apply the first available lens
        if (groupLenses.length > 0) {
          await session.applyLens(groupLenses[0]);
        }

        setStatus("ready");
      } catch (err) {
        console.error("Camera Kit init error:", err);
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to initialize camera");
          setStatus("error");
        }
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

  const handleLensSelect = useCallback(async (index) => {
    if (!sessionRef.current || !lenses[index]) return;
    setActiveLensIndex(index);
    await sessionRef.current.applyLens(lenses[index]);
  }, [lenses]);

  const handleRemoveLens = useCallback(async () => {
    if (!sessionRef.current) return;
    setActiveLensIndex(-1);
    await sessionRef.current.removeLens();
  }, []);

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000", fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
      animation: "cam-fadein 0.3s ease both",
    }}>
      <style>{`
        @keyframes cam-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cam-slideup {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Camera canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Loading overlay */}
      {status === "loading" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", color: "white", gap: 12,
        }}>
          <div style={{ fontSize: 36 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Starting camera...</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
            Please allow camera access when prompted
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.85)", color: "white", gap: 16,
          padding: 32,
        }}>
          <div style={{ fontSize: 36 }}>😔</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Camera unavailable</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
            {errorMsg}
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: 8, padding: "10px 28px", borderRadius: 10,
              border: "none", background: "white", color: "#1A1A2E",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Go back
          </button>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🕰️</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "white" }}>Time Friends</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)", border: "none",
            color: "white", fontSize: 20, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(8px)",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
        >
          ✕
        </button>
      </div>

      {/* Bottom lens picker */}
      {status === "ready" && lenses.length > 0 && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 16px 32px",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          zIndex: 10,
          animation: "cam-slideup 0.4s ease 0.2s both",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            textAlign: "center", marginBottom: 12,
          }}>
            Filters
          </div>
          <div style={{
            display: "flex", gap: 12, overflowX: "auto",
            justifyContent: "center", padding: "0 8px",
          }}>
            {/* No filter option */}
            <button
              onClick={handleRemoveLens}
              style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                border: activeLensIndex === -1 ? "3px solid #C4882D" : "2px solid rgba(255,255,255,0.4)",
                background: activeLensIndex === -1 ? "rgba(196,136,45,0.2)" : "rgba(255,255,255,0.12)",
                color: "white", fontSize: 11, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(8px)", transition: "all 0.2s ease",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              None
            </button>
            {lenses.map((lens, i) => (
              <button
                key={lens.id}
                onClick={() => handleLensSelect(i)}
                style={{
                  width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                  border: activeLensIndex === i ? "3px solid #C4882D" : "2px solid rgba(255,255,255,0.4)",
                  background: activeLensIndex === i ? "rgba(196,136,45,0.2)" : "rgba(255,255,255,0.12)",
                  color: "white", cursor: "pointer",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(8px)", transition: "all 0.2s ease",
                  fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
                }}
              >
                {lens.iconUrl ? (
                  <img
                    src={lens.iconUrl}
                    alt={lens.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 600, textAlign: "center", padding: 4, lineHeight: 1.2 }}>
                    {lens.name?.slice(0, 8) || `#${i + 1}`}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No lenses message */}
      {status === "ready" && lenses.length === 0 && (
        <div style={{
          position: "absolute", bottom: 32, left: 0, right: 0,
          textAlign: "center", color: "rgba(255,255,255,0.6)",
          fontSize: 13, zIndex: 10,
        }}>
          No lenses available in this lens group
        </div>
      )}
    </div>,
    document.body
  );
}
