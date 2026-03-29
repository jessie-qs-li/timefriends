import { useState } from "react";
import { createPortal } from "react-dom";

async function buildSharableImage(screenshotUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      // Gradient vignette at bottom
      const gradH = canvas.height * 0.32;
      const grad = ctx.createLinearGradient(0, canvas.height - gradH, 0, canvas.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, canvas.height - gradH, canvas.width, gradH);

      // "Where am I?" text
      const fontSize = Math.max(28, Math.round(canvas.width * 0.042));
      ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.fillText("🌍  Where am I?", canvas.width / 2, canvas.height - fontSize * 0.55);

      // Branding
      const brandSize = Math.round(fontSize * 0.48);
      ctx.font = `500 ${brandSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.shadowBlur = 0;
      ctx.fillText("Wonder • Time Friends", canvas.width / 2, canvas.height - brandSize * 0.4);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = screenshotUrl;
  });
}

const CHALLENGE_TEXT =
  "🌍 Can you guess where I am? I'm exploring the world on Wonder — challenge accepted? 🗺️✈️";

export default function GuessModal({ screenshotUrl, onClose }) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const watermarked = await buildSharableImage(screenshotUrl);
      const res = await fetch(watermarked);
      const blob = await res.blob();
      const file = new File([blob], "where-am-i.jpg", { type: "image/jpeg" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Where am I?", text: CHALLENGE_TEXT, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ title: "Where am I?", text: CHALLENGE_TEXT });
      } else {
        handleCopyText();
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
    } finally {
      setSharing(false);
    }
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(CHALLENGE_TEXT);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2200);
  }

  async function handleCopyImage() {
    try {
      const watermarked = await buildSharableImage(screenshotUrl);
      const res = await fetch(watermarked);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2200);
    } catch (err) {
      console.error("Copy image failed:", err);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const watermarked = await buildSharableImage(screenshotUrl);
      const a = document.createElement("a");
      a.href = watermarked;
      a.download = "where-am-i.jpg";
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  function handlePostX() {
    const text = encodeURIComponent(CHALLENGE_TEXT + " #WonderApp #GeoGuess");
    window.open(`https://x.com/intent/post?text=${text}`, "_blank", "noopener");
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(44, 36, 24, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        animation: "gm-fade 0.18s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        @keyframes gm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gm-slide { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: none } }
        .gm-sec {
          padding: 13px 8px 11px;
          border-radius: 12px;
          background: #FAF6EF;
          border: 1px solid #E8E0D4;
          color: #5A5A6A;
          font-size: 13px; font-weight: 500; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
          font-family: 'DM Sans', sans-serif;
          line-height: 1.2;
        }
        .gm-sec:hover { background: #F0EBE2; border-color: #D6CCBB; }
        .gm-sec:disabled { opacity: 0.55; cursor: default; }
        .gm-sec.success { background: #F0FAF2; border-color: #A8D5B5; color: #3A8A52; }
      `}</style>

      <div style={{
        background: "#FFFCF7",
        borderRadius: 22,
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(44,28,8,0.22), 0 0 0 1px #E8E0D4",
        animation: "gm-slide 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>

        {/* Header */}
        <div style={{
          padding: "22px 22px 0",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <div style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 26, color: "#1A1A2E", lineHeight: 1.15,
            }}>
              Where am I? 🌍
            </div>
            <div style={{ fontSize: 13, color: "#8B8070", marginTop: 4, fontWeight: 400 }}>
              Challenge your friends to guess your location
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "#F0EBE2", border: "1px solid #E8E0D4",
              color: "#8B8070", fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", transition: "background 0.13s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#E8E0D4"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#F0EBE2"; }}
          >✕</button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#F0EBE2", margin: "16px 0 0" }} />

        {/* Screenshot preview */}
        <div style={{ padding: "16px 22px" }}>
          <div style={{
            borderRadius: 14, overflow: "hidden",
            border: "1px solid #E8E0D4",
            background: "#1A1A2E",
            position: "relative",
          }}>
            <img
              src={screenshotUrl}
              alt="Mystery location screenshot"
              style={{ width: "100%", display: "block", maxHeight: 270, objectFit: "cover" }}
            />
            {/* "WHERE AM I?" overlay on preview */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
              padding: "28px 14px 11px",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 700, color: "white",
                letterSpacing: "0.12em", textTransform: "uppercase",
                textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              }}>
                🌍 &nbsp;Where am I?
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Primary CTA */}
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              width: "100%", padding: "13px",
              borderRadius: 12,
              background: sharing ? "#D4A855" : "#C4882D",
              border: "none", color: "white",
              fontSize: 15, fontWeight: 600,
              cursor: sharing ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 2px 12px rgba(196,136,45,0.28)",
              transition: "background 0.15s",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => { if (!sharing) e.currentTarget.style.background = "#B07825"; }}
            onMouseLeave={(e) => { if (!sharing) e.currentTarget.style.background = "#C4882D"; }}
          >
            {sharing ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
            <span>{sharing ? "Preparing…" : "Challenge Friends"}</span>
          </button>

          {/* 2×2 secondary grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

            <button
              className={`gm-sec${copiedText ? " success" : ""}`}
              onClick={handleCopyText}
            >
              {copiedText ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              )}
              <span>{copiedText ? "Copied!" : "Copy Challenge"}</span>
            </button>

            <button
              className="gm-sec"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 8 12 12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
              <span>{downloading ? "Saving…" : "Save Photo"}</span>
            </button>

            <button
              className={`gm-sec${copiedImg ? " success" : ""}`}
              onClick={handleCopyImage}
            >
              {copiedImg ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
              <span>{copiedImg ? "Copied!" : "Copy Image"}</span>
            </button>

            <button
              className="gm-sec"
              onClick={handlePostX}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>Post to X</span>
            </button>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
