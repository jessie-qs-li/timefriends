import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Conversation } from "@11labs/client";

function FloatingWidget({ figure, mode, onEnd }) {
  const isSpeaking = mode === "speaking";

  return createPortal(
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      width: 290, borderRadius: 20,
      background: "white", border: "1.5px solid #E8E0D4",
      boxShadow: "0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07)",
      animation: "tf-slideup 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      overflow: "hidden", fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @keyframes tf-slideup {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes tf-pulse {
          0%, 100% { opacity: 1; transform: scale(1);   }
          50%       { opacity: 0.4; transform: scale(1.6); }
        }
        @keyframes tf-bar {
          0%, 100% { transform: scaleY(0.35); }
          50%       { transform: scaleY(1);    }
        }
      `}</style>

      {/* Portrait header */}
      <div style={{
        background: `linear-gradient(160deg, ${figure.color}22 0%, ${figure.color}08 100%)`,
        padding: "20px 20px 16px",
        borderBottom: "1px solid #F0EBE2",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${figure.color}30, ${figure.color}60)`,
          border: `3px solid ${figure.color}`,
          overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          boxShadow: `0 4px 16px ${figure.color}44`,
        }}>
          <img
            src={figure.portrait} alt={figure.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
          <span style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
            {figure.emoji}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E" }}>{figure.name}</div>
          <div style={{ fontSize: 12, color: figure.color, fontWeight: 600, marginTop: 1 }}>{figure.title}</div>
        </div>
      </div>

      {/* Status + end button */}
      <div style={{ padding: "16px 20px 18px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          padding: "10px 14px", borderRadius: 12,
          background: isSpeaking ? `${figure.color}10` : "#E8F5E9",
          border: `1.5px solid ${isSpeaking ? figure.color + "35" : "#A5D6A7"}`,
        }}>
          {isSpeaking ? (
            /* animated sound bars */
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 18, flexShrink: 0 }}>
              {[0.5, 0.8, 1, 0.8, 0.5].map((h, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: figure.color,
                  height: `${h * 18}px`,
                  transformOrigin: "center",
                  animation: `tf-bar 0.75s ease-in-out ${i * 0.12}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            /* pulsing mic dot */
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: "#4CAF50",
              animation: "tf-pulse 1.4s ease-in-out infinite",
            }} />
          )}
          <span style={{
            fontSize: 13, fontWeight: 600,
            color: isSpeaking ? figure.color : "#2E7D32",
          }}>
            {isSpeaking ? `${figure.name} is speaking…` : "Listening…"}
          </span>
        </div>

        <button
          onClick={onEnd}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 10,
            border: "1.5px solid #F5C4BB", background: "#FFF0EE",
            color: "#B85C3A", fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#FFE4DE"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#FFF0EE"; }}
        >
          End conversation
        </button>
      </div>
    </div>,
    document.body
  );
}

export default function ConversationButton({ figure }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | disconnecting
  const [mode, setMode] = useState("listening");
  const convRef = useRef(null);

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
        onModeChange: ({ mode }) => setMode(mode),
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

  const end = async () => {
    setStatus("disconnecting");
    if (convRef.current) await convRef.current.endSession();
  };

  useEffect(() => {
    return () => { if (convRef.current) convRef.current.endSession(); };
  }, []);

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
          🎙️  Talk to {figure.name}
        </button>
      )}

      {status === "connecting" && (
        <button disabled style={{ ...base, cursor: "not-allowed", background: "#F0EBE2", color: "#A89870" }}>
          ⏳  Connecting…
        </button>
      )}

      {status === "connected" && (
        <button disabled style={{ ...base, cursor: "default", background: `${figure.color}18`, color: figure.color, border: `1.5px solid ${figure.color}40` }}>
          🎙️  In conversation
        </button>
      )}

      {status === "disconnecting" && (
        <button disabled style={{ ...base, cursor: "not-allowed", background: "#F0EBE2", color: "#A89870" }}>
          Ending…
        </button>
      )}

      {status === "connected" && (
        <FloatingWidget figure={figure} mode={mode} onEnd={end} />
      )}
    </>
  );
}
