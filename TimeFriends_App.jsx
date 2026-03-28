import { useState, useEffect, useRef } from "react";

const VERSAILLES_INFO = {
  name: "Palace of Versailles",
  location: "Versailles, France",
  coords: "48.8049°N, 2.1204°E",
  built: "1682",
  facts: [
    "Over 2,300 rooms across the palace",
    "The Hall of Mirrors has 357 mirrors",
    "Gardens cover 800 hectares",
    "Up to 10,000 people lived here at once",
    "Construction took over 50 years",
  ],
};

const CHARACTER = {
  name: "Louis XIV",
  title: "The Sun King",
  reign: "1643–1715",
  age: "In his prime, ~35",
  emoji: "👑",
  traits: ["Theatrical", "Proud", "Witty", "Commanding"],
  knowledgeAreas: ["Court life & etiquette", "Art & architecture", "French politics", "Dance & performance", "Gardens & design"],
};

const MODES = [
  { id: "explorer", name: "Explorer", icon: "🧭", desc: "Guided tour of the palace" },
  { id: "story", name: "Story", icon: "📖", desc: "Live a day at court" },
  { id: "quiz", name: "Quiz Quest", icon: "⚡", desc: "Test your knowledge" },
  { id: "chat", name: "Free Chat", icon: "💬", desc: "Ask anything" },
];

const TOPICS_VISITED = [
  { topic: "Hall of Mirrors", time: "3 min", depth: 85 },
  { topic: "Court etiquette", time: "2 min", depth: 60 },
  { topic: "Royal gardens", time: "1 min", depth: 40 },
];

function MiniMap() {
  return (
    <svg viewBox="0 0 280 160" style={{ width: "100%", borderRadius: 12, background: "#E8E0D0" }}>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#D4CCBC" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="160" fill="url(#grid)" />
      {/* Palace outline */}
      <rect x="60" y="50" width="160" height="50" rx="3" fill="#C9B896" stroke="#A89870" strokeWidth="1.5" />
      <rect x="90" y="40" width="100" height="15" rx="2" fill="#D4C4A0" stroke="#A89870" strokeWidth="1" />
      {/* Wings */}
      <rect x="30" y="55" width="35" height="40" rx="2" fill="#D4C4A0" stroke="#A89870" strokeWidth="1" />
      <rect x="215" y="55" width="35" height="40" rx="2" fill="#D4C4A0" stroke="#A89870" strokeWidth="1" />
      {/* Gardens */}
      <rect x="100" y="105" width="80" height="45" rx="2" fill="#8BAA7A" opacity="0.5" />
      <line x1="140" y1="105" x2="140" y2="150" stroke="#6B8A5A" strokeWidth="0.8" />
      <line x1="100" y1="127" x2="180" y2="127" stroke="#6B8A5A" strokeWidth="0.8" />
      {/* Location pin */}
      <circle cx="140" cy="65" r="6" fill="#E25B45" opacity="0.9" />
      <circle cx="140" cy="65" r="10" fill="none" stroke="#E25B45" strokeWidth="1.5" opacity="0.4">
        <animate attributeName="r" from="8" to="16" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="65" r="2.5" fill="white" />
      {/* Labels */}
      <text x="140" y="30" textAnchor="middle" style={{ fontSize: 9, fill: "#6B5D4A", fontFamily: "sans-serif", fontWeight: 600 }}>Palace of Versailles</text>
      <text x="140" y="140" textAnchor="middle" style={{ fontSize: 7, fill: "#6B8A5A", fontFamily: "sans-serif" }}>Royal Gardens</text>
    </svg>
  );
}

function DepthBar({ value, color }) {
  return (
    <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#E8E0D4" }}>
      <div style={{
        width: `${value}%`, height: "100%", borderRadius: 3,
        background: color, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

export default function TimeFriendsApp() {
  const [activeMode, setActiveMode] = useState("chat");
  const [age, setAge] = useState(9);
  const [sessionTime, setSessionTime] = useState(387);
  const [showFacts, setShowFacts] = useState(false);
  const widgetRef = useRef(null);

  // Load ElevenLabs widget: load script first, then create custom element after it registers
  useEffect(() => {
    const container = widgetRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    script.onload = () => {
      // Script has loaded and registered the custom element — now safe to create it
      const widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", "agent_3801kmv6gtp9fsprs56hz044qw6q");
      container.appendChild(widget);
    };
    document.body.appendChild(script);

    return () => {
      try { container.innerHTML = ""; } catch(e) {}
      try { document.body.removeChild(script); } catch(e) {}
    };
  }, []);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => setSessionTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getAgeLabel = () => {
    if (age <= 7) return "Early Explorer";
    if (age <= 10) return "Adventurer";
    return "Young Historian";
  };

  const getAgeDot = () => {
    if (age <= 7) return "#E8A838";
    if (age <= 10) return "#2B9E9E";
    return "#6366A0";
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAF6EF", minHeight: "100vh", color: "#2C2C3A", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #FAF6EF; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D4CCBC; border-radius: 3px; }
        .mode-btn { cursor: pointer; border: 1.5px solid #E8E0D4; background: white; border-radius: 12px; padding: 10px 8px; text-align: center; transition: all 0.2s ease; flex: 1; }
        .mode-btn:hover { border-color: #C9B896; background: #FFFCF5; }
        .mode-btn.active { border-color: #C4882D; background: #FFF8EE; box-shadow: 0 0 0 1px #C4882D; }
        .info-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #F0EBE2; font-size: 13px; }
        .info-row:last-child { border: none; }
        .tag { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; margin: 2px; }
        .fact-item { padding: 8px 12px; border-radius: 8px; background: #F5F0E6; font-size: 12px; line-height: 1.5; margin-bottom: 6px; color: #5A5A6A; }
        .panel { background: white; border-radius: 16px; border: 1px solid #E8E0D4; overflow: hidden; }
        .panel-header { padding: 14px 18px; border-bottom: 1px solid #F0EBE2; font-size: 12px; font-weight: 600; color: #8B8070; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 8px; }
        .panel-body { padding: 18px; }
        .topic-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
        .session-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 99px; font-size: 12px; font-weight: 600; }
        elevenlabs-convai { position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 999 !important; }
      `}</style>

      {/* TOP BAR */}
      <header style={{
        background: "white", borderBottom: "1px solid #E8E0D4",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 20 }}>🕰️</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#1A1A2E" }}>Time Friends</span>
          <div style={{ width: 1, height: 24, background: "#E8E0D4", margin: "0 6px" }} />
          <span style={{ fontSize: 13, color: "#8B8070" }}>🏛️ Palace of Versailles</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="session-badge" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
            Live · {formatTime(sessionTime)}
          </div>
          <div className="session-badge" style={{ background: getAgeDot() + "15", color: getAgeDot() }}>
            Age {age} · {getAgeLabel()}
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "#F5E6D0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            border: "2px solid #E8D4B8", cursor: "pointer",
          }}>👧</div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 280px", flex: 1, height: "calc(100vh - 56px)", overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <aside style={{ borderRight: "1px solid #E8E0D4", background: "#FFFCF7", overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Character Card */}
          <div className="panel">
            <div style={{
              padding: "24px 18px 18px", textAlign: "center",
              background: "linear-gradient(180deg, #F9F0E0 0%, white 100%)",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px",
                background: "linear-gradient(135deg, #F0D68C, #C9A84C)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 34, boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
                border: "3px solid white",
              }}>👑</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "#1A1A2E" }}>
                {CHARACTER.name}
              </div>
              <div style={{ fontSize: 13, color: "#8B8070", marginTop: 2 }}>{CHARACTER.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4, marginTop: 12 }}>
                {CHARACTER.traits.map(t => (
                  <span key={t} className="tag" style={{ background: "#F5F0E6", color: "#7A6F5A" }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div className="info-row">
                <span style={{ color: "#8B8070" }}>Era</span>
                <span style={{ fontWeight: 600 }}>Reign: {CHARACTER.reign}</span>
              </div>
              <div className="info-row">
                <span style={{ color: "#8B8070" }}>Location</span>
                <span style={{ fontWeight: 600 }}>{VERSAILLES_INFO.location}</span>
              </div>
              <div className="info-row">
                <span style={{ color: "#8B8070" }}>Speaks as</span>
                <span style={{ fontWeight: 600 }}>{CHARACTER.age}</span>
              </div>
            </div>
          </div>

          {/* Knowledge Areas */}
          <div className="panel">
            <div className="panel-header">🧠 Knowledge Areas</div>
            <div className="panel-body" style={{ padding: "12px 18px" }}>
              {CHARACTER.knowledgeAreas.map((k, i) => (
                <div key={i} style={{
                  padding: "7px 0", borderBottom: i < CHARACTER.knowledgeAreas.length - 1 ? "1px solid #F0EBE2" : "none",
                  fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#C9A84C", flexShrink: 0 }} />
                  {k}
                </div>
              ))}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="panel">
            <div className="panel-header">🎮 Mode</div>
            <div className="panel-body" style={{ padding: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {MODES.map(m => (
                  <div
                    key={m.id}
                    className={`mode-btn ${activeMode === m.id ? "active" : ""}`}
                    onClick={() => setActiveMode(m.id)}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activeMode === m.id ? "#C4882D" : "#5A5A6A" }}>{m.name}</div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 10, padding: "10px 12px", borderRadius: 10,
                background: "#FFF8EE", border: "1px solid #F0E4D0",
                fontSize: 12, color: "#8B7040", lineHeight: 1.5,
              }}>
                {MODES.find(m => m.id === activeMode)?.desc}
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER — CONVERSATION AREA */}
        <main style={{ background: "#FAF6EF", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Location Header Bar */}
          <div style={{
            padding: "16px 28px", borderBottom: "1px solid #E8E0D4", background: "white",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #F0D68C, #C9A84C)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>🏛️</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{VERSAILLES_INFO.name}</div>
                <div style={{ fontSize: 12, color: "#8B8070" }}>{VERSAILLES_INFO.location} · Built {VERSAILLES_INFO.built}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowFacts(!showFacts)}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "1px solid #E8E0D4",
                  background: showFacts ? "#FFF8EE" : "white", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, color: "#5A5A6A", fontFamily: "'DM Sans', sans-serif",
                }}
              >📍 Quick Facts</button>
            </div>
          </div>

          {showFacts && (
            <div style={{ padding: "14px 28px", background: "#FFFBF2", borderBottom: "1px solid #F0E4D0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {VERSAILLES_INFO.facts.map((f, i) => (
                  <div key={i} className="fact-item">✦ {f}</div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation Space */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "40px 28px", overflow: "auto",
          }}>
            <div style={{ textAlign: "center", maxWidth: 480 }}>
              <div style={{
                width: 100, height: 100, borderRadius: "50%", margin: "0 auto 24px",
                background: "linear-gradient(135deg, #F9F0E0, #F0D68C)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 50, boxShadow: "0 8px 32px rgba(201,168,76,0.2)",
                border: "4px solid white",
              }}>👑</div>
              <h2 style={{
                fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#1A1A2E",
                fontWeight: 400, marginBottom: 8,
              }}>
                Louis XIV awaits
              </h2>
              <p style={{ fontSize: 15, color: "#8B8070", lineHeight: 1.7, marginBottom: 32 }}>
                The Sun King is ready to speak with you about his palace, his court, and his reign.
                Tap the microphone button in the bottom-right corner to begin your audience.
              </p>

              {/* Suggested prompts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#A89870", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  Try asking
                </div>
                {[
                  "Why did you build this palace?",
                  "What happens at a royal ball?",
                  "Tell me about the Hall of Mirrors",
                  "What do you eat for breakfast?",
                ].map((q, i) => (
                  <div key={i} style={{
                    padding: "10px 20px", borderRadius: 99, background: "white",
                    border: "1px solid #E8E0D4", fontSize: 13, color: "#5A5A6A",
                    cursor: "pointer", transition: "all 0.2s ease",
                    maxWidth: 320, width: "100%",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#FFF8EE"; e.currentTarget.style.borderColor = "#C9A84C"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#E8E0D4"; }}
                  >
                    💬 {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside style={{ borderLeft: "1px solid #E8E0D4", background: "#FFFCF7", overflowY: "auto", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Mini Map */}
          <div className="panel">
            <div className="panel-header">📍 Location</div>
            <div style={{ padding: "12px" }}>
              <MiniMap />
              <div style={{ fontSize: 11, color: "#8B8070", textAlign: "center", marginTop: 8 }}>
                {VERSAILLES_INFO.coords}
              </div>
            </div>
          </div>

          {/* Age Calibration */}
          <div className="panel">
            <div className="panel-header">🎚️ Age Calibration</div>
            <div className="panel-body">
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <span style={{
                  fontFamily: "'Instrument Serif', serif", fontSize: 36, color: "#1A1A2E",
                }}>{age}</span>
                <span style={{ fontSize: 13, color: "#8B8070", marginLeft: 6 }}>years old</span>
              </div>
              <input
                type="range" min={5} max={13} value={age}
                onChange={e => setAge(Number(e.target.value))}
                style={{
                  width: "100%", height: 6, borderRadius: 3, appearance: "none",
                  background: `linear-gradient(90deg, #E8A838, #2B9E9E, #6366A0)`,
                  outline: "none", cursor: "pointer",
                }}
              />
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
                  background: white; border: 2.5px solid #1A1A2E; cursor: pointer;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                }
              `}</style>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A89870", marginTop: 6 }}>
                <span>5</span><span>13</span>
              </div>
              <div style={{
                marginTop: 12, padding: "8px 12px", borderRadius: 8,
                background: getAgeDot() + "10", textAlign: "center",
                fontSize: 12, fontWeight: 600, color: getAgeDot(),
              }}>
                {getAgeLabel()}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: "#8B8070", lineHeight: 1.6 }}>
                {age <= 7
                  ? "Simple words, lots of questions, playful stories, short sessions."
                  : age <= 10
                  ? "Richer dialogue, moral reasoning, character-driven learning."
                  : "Nuance, primary sources, complex vocabulary, honest history."}
              </div>
            </div>
          </div>

          {/* Session Progress */}
          <div className="panel">
            <div className="panel-header">📊 Session Progress</div>
            <div className="panel-body" style={{ padding: "12px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5A5A6A", marginBottom: 12 }}>
                Topics explored
              </div>
              {TOPICS_VISITED.map((t, i) => (
                <div key={i} className="topic-row" style={{ borderBottom: i < TOPICS_VISITED.length - 1 ? "1px solid #F0EBE2" : "none", paddingBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.topic}</div>
                    <DepthBar value={t.depth} color={t.depth > 70 ? "#2B9E9E" : t.depth > 50 ? "#E8A838" : "#D4CCBC"} />
                  </div>
                  <div style={{ fontSize: 11, color: "#A89870", flexShrink: 0 }}>{t.time}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 11, color: "#8B8070", textAlign: "center" }}>
                {TOPICS_VISITED.length} topics · {formatTime(sessionTime)} elapsed
              </div>
            </div>
          </div>

          {/* Photo Context */}
          <div className="panel">
            <div className="panel-header">📷 Photo Context</div>
            <div className="panel-body" style={{ textAlign: "center" }}>
              <div style={{
                padding: "24px", borderRadius: 12, border: "2px dashed #D4CCBC",
                background: "#FAF6EF", cursor: "pointer",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📷</div>
                <div style={{ fontSize: 12, color: "#8B8070", lineHeight: 1.5 }}>
                  Take a photo of what you see and Louis will comment on it
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ElevenLabs Widget — element created imperatively after script loads */}
      <div ref={widgetRef} />
    </div>
  );
}
