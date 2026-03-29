import { useState, useEffect, useRef, useCallback } from "react";
import { Conversation } from "@11labs/client";

/** Full-height right panel: hero portrait on top, status + end below. Used from App when a session is active. */
export function ConversationSidePanel({ figure, mode, sessionStatus, onEnd }) {
  const isSpeaking = mode === "speaking";
  const ending = sessionStatus === "disconnecting";

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      background: "#FFFCF7",
      fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
    }}>
      <style>{`
        @keyframes tf-pulse {
          0%, 100% { opacity: 1; transform: scale(1);   }
          50%       { opacity: 0.4; transform: scale(1.6); }
        }
        @keyframes tf-bar {
          0%, 100% { transform: scaleY(0.35); }
          50%       { transform: scaleY(1);    }
        }
      `}</style>

      {/* Portrait: full image visible (letterboxed), no cropping */}
      <div style={{
        width: "100%", flexShrink: 0,
        background: `linear-gradient(145deg, ${figure.color}18, ${figure.color}38)`,
        borderBottom: "1px solid #F0EBE2",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "12px 14px",
          minHeight: 140,
          maxHeight: "min(48vh, 520px)",
          boxSizing: "border-box",
        }}>
          <img
            src={figure.portrait}
            alt={figure.name}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "min(48vh, 520px)",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.target.style.display = "none";
              const fb = e.target.nextSibling;
              if (fb) fb.style.display = "flex";
            }}
          />
          <div style={{
            display: "none", alignItems: "center", justifyContent: "center",
            fontSize: 64, minHeight: 100,
          }}>{figure.emoji}</div>
        </div>
        <div style={{ padding: "14px 18px 16px", borderTop: "1px solid #F0EBE2", background: "#FFFCF7" }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E",
            lineHeight: 1.2,
          }}>{figure.name}</div>
          <div style={{
            fontSize: 12, color: figure.color, fontWeight: 600, marginTop: 4,
          }}>{figure.title}</div>
        </div>
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "22px 22px 24px", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 14,
        }}>Live conversation</div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
          padding: "12px 16px", borderRadius: 12,
          background: isSpeaking ? `${figure.color}10` : "#E8F5E9",
          border: `1.5px solid ${isSpeaking ? figure.color + "35" : "#A5D6A7"}`,
        }}>
          {isSpeaking ? (
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 20, flexShrink: 0 }}>
              {[0.5, 0.8, 1, 0.8, 0.5].map((h, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: figure.color,
                  height: `${h * 20}px`,
                  transformOrigin: "center",
                  animation: `tf-bar 0.75s ease-in-out ${i * 0.12}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: "#4CAF50",
              animation: "tf-pulse 1.4s ease-in-out infinite",
            }} />
          )}
          <span style={{
            fontSize: 14, fontWeight: 600,
            color: isSpeaking ? figure.color : "#2E7D32",
          }}>
            {ending ? "Ending…" : isSpeaking ? `${figure.name} is speaking…` : "Listening…"}
          </span>
        </div>

        <button
          type="button"
          onClick={onEnd}
          disabled={ending}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10,
            border: "1.5px solid #F5C4BB", background: ending ? "#F5F0E8" : "#FFF0EE",
            color: ending ? "#A89870" : "#B85C3A", fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 700, cursor: ending ? "not-allowed" : "pointer",
            transition: "all 0.15s ease", marginTop: "auto",
          }}
          onMouseEnter={(e) => { if (!ending) e.currentTarget.style.background = "#FFE4DE"; }}
          onMouseLeave={(e) => { if (!ending) e.currentTarget.style.background = "#FFF0EE"; }}
        >
          End conversation
        </button>
      </div>
    </div>
  );
}

export default function ConversationButton({ figure, onConversationState }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | disconnecting
  const [mode, setMode] = useState("listening");
  const convRef = useRef(null);

  const end = useCallback(async () => {
    setStatus("disconnecting");
    if (convRef.current) await convRef.current.endSession();
  }, []);

  const start = async () => {
    setStatus("connecting");
    try {
      const conv = await Conversation.startSession({
        agentId: figure.agentId,
        onConnect: () => setStatus("connected"),
        onDisconnect: () => {
          setStatus("idle");
          setMode("listening");
          convRef.current = null;
        },
        onModeChange: ({ mode: m }) => setMode(m),
        onError: (msg) => {
          console.error("Conversation error:", msg);
          setStatus("idle");
          convRef.current = null;
        },
      });
      convRef.current = conv;
    } catch (e) {
      console.error("Failed to start session:", e);
      setStatus("idle");
    }
  };

  const prevStatusRef = useRef(status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;
    if (!onConversationState) return;
    if (status === "connected" || status === "disconnecting") {
      onConversationState({
        figure,
        mode,
        sessionStatus: status,
        endSession: end,
      });
    } else if (status === "idle" && (prev === "connected" || prev === "disconnecting")) {
      onConversationState(null);
    }
  }, [status, mode, figure, end, onConversationState]);

  useEffect(() => {
    return () => {
      if (convRef.current) convRef.current.endSession();
      if (onConversationState && (prevStatusRef.current === "connected" || prevStatusRef.current === "disconnecting")) {
        onConversationState(null);
      }
    };
  }, [onConversationState]);

  const base = {
    width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700,
    transition: "all 0.2s ease", marginTop: 14, cursor: "pointer",
  };

  return (
    <>
      {status === "idle" && (
        <button
          onClick={start}
          style={{
            ...base,
            background: `linear-gradient(135deg, ${figure.color}, ${figure.color}CC)`,
            color: "white",
            boxShadow: `0 2px 12px ${figure.color}44`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          Talk to {figure.name}
        </button>
      )}

      {status === "connecting" && (
        <button disabled style={{ ...base, cursor: "not-allowed", background: "#F0EBE2", color: "#A89870" }}>
          Connecting…
        </button>
      )}

      {status === "connected" && (
        <button disabled style={{ ...base, cursor: "default", background: `${figure.color}18`, color: figure.color, border: `1.5px solid ${figure.color}40` }}>
          In conversation
        </button>
      )}

      {status === "disconnecting" && (
        <button disabled style={{ ...base, cursor: "not-allowed", background: "#F0EBE2", color: "#A89870" }}>
          Ending…
        </button>
      )}
    </>
  );
}
