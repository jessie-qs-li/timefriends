import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Data ────────────────────────────────────────────────────────────────────

const LANDMARKS = [
  {
    id: "versailles",
    name: "Palace of Versailles",
    location: "Versailles, France",
    coords: [48.8049, 2.1204],
    icon: "🏛️",
    era: "17th Century",
    color: "#C4882D",
    unlockRadius: 500, // meters
    description: "The opulent royal château that became the center of political power in France.",
    figures: [
      { id: "louis-xiv", name: "Louis XIV", title: "The Sun King", reign: "1643–1715", emoji: "👑", color: "#C9A84C", agentId: "agent_3801kmv6gtp9fsprs56hz044qw6q", traits: ["Theatrical", "Proud", "Commanding"], preview: "I built this palace to show the world the glory of France." },
      { id: "marie-antoinette", name: "Marie Antoinette", title: "The Last Queen", reign: "1755–1793", emoji: "👸", color: "#D4738A", agentId: null, traits: ["Elegant", "Misunderstood", "Spirited"], preview: "Life at court is far more complex than the gossip suggests." },
      { id: "le-notre", name: "André Le Nôtre", title: "Royal Gardener", reign: "1613–1700", emoji: "🌳", color: "#5A8F5A", agentId: null, traits: ["Visionary", "Patient", "Meticulous"], preview: "A garden must reflect the order of the cosmos itself." },
    ],
  },
  {
    id: "colosseum",
    name: "The Colosseum",
    location: "Rome, Italy",
    coords: [41.8902, 12.4922],
    icon: "🏟️",
    era: "1st Century",
    color: "#B85C3A",
    unlockRadius: 500,
    description: "The greatest amphitheatre of the Roman Empire, where gladiators once fought.",
    figures: [
      { id: "julius-caesar", name: "Julius Caesar", title: "Dictator of Rome", reign: "100–44 BC", emoji: "⚔️", color: "#8B0000", agentId: null, traits: ["Strategic", "Ambitious", "Charismatic"], preview: "I came, I saw, I conquered — and I shall tell you how." },
      { id: "nero", name: "Emperor Nero", title: "The Infamous Emperor", reign: "37–68 AD", emoji: "🔥", color: "#D4652A", agentId: null, traits: ["Artistic", "Controversial", "Complex"], preview: "History has not been kind to me. Let me share my side." },
      { id: "livia", name: "Livia Drusilla", title: "Empress of Rome", reign: "58 BC–29 AD", emoji: "🏛️", color: "#7B6BA0", agentId: null, traits: ["Shrewd", "Powerful", "Diplomatic"], preview: "Behind every great emperor, there is a greater mind." },
    ],
  },
  {
    id: "giza",
    name: "Pyramids of Giza",
    location: "Giza, Egypt",
    coords: [29.9792, 31.1342],
    icon: "🔺",
    era: "26th Century BC",
    color: "#C9A84C",
    unlockRadius: 500,
    description: "The last surviving wonder of the ancient world, tombs of the great pharaohs.",
    figures: [
      { id: "khufu", name: "Pharaoh Khufu", title: "Builder of the Great Pyramid", reign: "2589–2566 BC", emoji: "👁️", color: "#C9A84C", agentId: null, traits: ["Visionary", "Powerful", "Enigmatic"], preview: "My pyramid shall touch the heavens and last for eternity." },
      { id: "cleopatra", name: "Cleopatra VII", title: "The Last Pharaoh", reign: "69–30 BC", emoji: "🐍", color: "#2E8B57", agentId: null, traits: ["Brilliant", "Multilingual", "Strategic"], preview: "I speak nine languages and rule the richest kingdom on earth." },
    ],
  },
  {
    id: "acropolis",
    name: "The Acropolis",
    location: "Athens, Greece",
    coords: [37.9715, 23.7267],
    icon: "🏛️",
    era: "5th Century BC",
    color: "#4A7FB5",
    unlockRadius: 500,
    description: "The sacred hilltop citadel and home of the Parthenon in ancient Athens.",
    figures: [
      { id: "pericles", name: "Pericles", title: "Statesman of Athens", reign: "495–429 BC", emoji: "🗳️", color: "#4A7FB5", agentId: null, traits: ["Eloquent", "Democratic", "Bold"], preview: "We do not imitate — we are a model to others." },
      { id: "socrates", name: "Socrates", title: "The Philosopher", reign: "470–399 BC", emoji: "🤔", color: "#6B5B73", agentId: null, traits: ["Curious", "Ironic", "Fearless"], preview: "I know that I know nothing — shall we discover together?" },
      { id: "aspasia", name: "Aspasia", title: "Intellectual & Rhetorician", reign: "470–400 BC", emoji: "📜", color: "#B8860B", agentId: null, traits: ["Intellectual", "Influential", "Eloquent"], preview: "They say I taught Pericles himself how to speak." },
    ],
  },
  {
    id: "great-wall",
    name: "Great Wall of China",
    location: "Beijing, China",
    coords: [40.4319, 116.5704],
    icon: "🧱",
    era: "7th Century BC – 17th Century",
    color: "#8B6F47",
    unlockRadius: 500,
    description: "The monumental fortification stretching over 13,000 miles across northern China.",
    figures: [
      { id: "qin-shi-huang", name: "Qin Shi Huang", title: "First Emperor of China", reign: "259–210 BC", emoji: "🐉", color: "#8B0000", agentId: null, traits: ["Ruthless", "Visionary", "Unifier"], preview: "I united the warring states and built a wall to protect them all." },
      { id: "mulan", name: "Hua Mulan", title: "Legendary Warrior", reign: "~5th Century", emoji: "🗡️", color: "#C04040", agentId: null, traits: ["Brave", "Loyal", "Resourceful"], preview: "I took my father's place in the army. Honor demanded nothing less." },
    ],
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    location: "Cusco, Peru",
    coords: [-13.1631, -72.5450],
    icon: "⛰️",
    era: "15th Century",
    color: "#3A7D44",
    unlockRadius: 500,
    description: "The breathtaking Incan citadel set high in the Andes Mountains.",
    figures: [
      { id: "pachacuti", name: "Pachacuti", title: "Founder of Machu Picchu", reign: "1418–1472", emoji: "🌄", color: "#3A7D44", agentId: null, traits: ["Builder", "Conqueror", "Innovator"], preview: "I transformed a small kingdom into the greatest empire in the Americas." },
    ],
  },
];

const DEFAULT_USER_POS = [48.8566, 2.3522]; // Paris — close to Versailles for demo

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000).toLocaleString()}km`;
}

// ─── Custom map marker icons ────────────────────────────────────────────────

function createLandmarkIcon(emoji, color, isNearby, isSelected) {
  const size = isSelected ? 52 : 44;
  const ring = isNearby ? `box-shadow: 0 0 0 3px ${color}44, 0 0 12px ${color}66;` : "";
  const glow = isSelected ? `box-shadow: 0 0 0 4px ${color}, 0 0 20px ${color}88;` : ring;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:white;border:3px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:${isSelected ? 26 : 22}px;cursor:pointer;
      ${glow}
      transition:all 0.2s ease;
    ">${emoji}</div>`,
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#4285F4;border:3px solid white;
      box-shadow:0 0 0 2px #4285F444, 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
  });
}

// ─── Map helper: fly to location ────────────────────────────────────────────

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick });
  return null;
}

// ─── Landmark List Sidebar ──────────────────────────────────────────────────

function LandmarkList({ landmarks, userPos, parentOverride, selectedId, onSelect }) {
  const sorted = useMemo(() => {
    return [...landmarks]
      .map((lm) => ({ ...lm, distance: haversineDistance(userPos, lm.coords) }))
      .sort((a, b) => a.distance - b.distance);
  }, [landmarks, userPos]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((lm) => {
        const isNearby = lm.distance <= lm.unlockRadius || parentOverride;
        const isSelected = selectedId === lm.id;
        return (
          <div
            key={lm.id}
            onClick={() => onSelect(lm.id)}
            style={{
              padding: "14px 16px", borderRadius: 14, cursor: "pointer",
              background: isSelected ? lm.color + "12" : "white",
              border: `1.5px solid ${isSelected ? lm.color : "#E8E0D4"}`,
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: `${lm.color}18`, border: `1.5px solid ${lm.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>{lm.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lm.name}</div>
                <div style={{ fontSize: 11, color: "#8B8070" }}>{lm.location}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
                  background: isNearby ? "#E8F5E9" : "#FFF3E0",
                  color: isNearby ? "#2E7D32" : "#E65100",
                }}>
                  {isNearby ? "✓ Nearby" : formatDistance(lm.distance)}
                </div>
                <div style={{ fontSize: 10, color: "#A89870", marginTop: 3 }}>
                  {lm.figures.length} {lm.figures.length === 1 ? "figure" : "figures"}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Figure Card ────────────────────────────────────────────────────────────

function FigureCard({ figure, isLocked, onTalk }) {
  return (
    <div style={{
      padding: "16px", borderRadius: 14, background: "white",
      border: "1.5px solid #E8E0D4", transition: "all 0.2s ease",
      opacity: isLocked ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${figure.color}30, ${figure.color}60)`,
          border: `2.5px solid ${figure.color}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>{figure.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>{figure.name}</div>
          <div style={{ fontSize: 12, color: figure.color, fontWeight: 600, marginTop: 1 }}>{figure.title}</div>
          <div style={{ fontSize: 11, color: "#8B8070", marginTop: 1 }}>{figure.reign}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 12 }}>
        {figure.traits.map((t) => (
          <span key={t} style={{
            padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: "#F5F0E6", color: "#7A6F5A",
          }}>{t}</span>
        ))}
      </div>

      <div style={{
        marginTop: 12, padding: "10px 14px", borderRadius: 10,
        background: "#FAF6EF", fontSize: 12, color: "#5A5A6A",
        fontStyle: "italic", lineHeight: 1.6, borderLeft: `3px solid ${figure.color}40`,
      }}>
        "{figure.preview}"
      </div>

      <button
        onClick={() => !isLocked && onTalk(figure)}
        disabled={isLocked}
        style={{
          marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 10,
          border: "none", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 700, cursor: isLocked ? "not-allowed" : "pointer",
          background: isLocked ? "#E8E0D4" : `linear-gradient(135deg, ${figure.color}, ${figure.color}CC)`,
          color: isLocked ? "#A89870" : "white",
          transition: "all 0.2s ease",
          boxShadow: isLocked ? "none" : `0 2px 12px ${figure.color}44`,
        }}
      >
        {isLocked ? "🔒  Travel here to unlock" : figure.agentId ? "🎙️  Start conversation" : "🔜  Coming soon"}
      </button>
    </div>
  );
}

// ─── Landmark Detail Panel ──────────────────────────────────────────────────

function LandmarkDetail({ landmark, isNearby, onTalk, onClose }) {
  if (!landmark) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "20px 20px 16px", borderBottom: "1px solid #F0EBE2",
        background: `linear-gradient(135deg, ${landmark.color}08, ${landmark.color}15)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button onClick={onClose} style={{
            background: "white", border: "1px solid #E8E0D4", borderRadius: 8,
            padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: "#5A5A6A", fontFamily: "'DM Sans', sans-serif",
          }}>← Back</button>
          <div style={{
            fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99,
            background: isNearby ? "#E8F5E9" : "#FFF3E0",
            color: isNearby ? "#2E7D32" : "#E65100",
          }}>
            {isNearby ? "✓ Unlocked" : "🔒 Locked — go to location"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${landmark.color}30, ${landmark.color}60)`,
            border: `2px solid ${landmark.color}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}>{landmark.icon}</div>
          <div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E" }}>{landmark.name}</div>
            <div style={{ fontSize: 12, color: "#8B8070", marginTop: 2 }}>{landmark.location} · {landmark.era}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#5A5A6A", lineHeight: 1.6, marginTop: 12 }}>{landmark.description}</p>
      </div>

      {/* Figures */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 12,
        }}>
          Historical figures ({landmark.figures.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {landmark.figures.map((f) => (
            <FigureCard key={f.id} figure={f} isLocked={!isNearby} onTalk={onTalk} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function TimeFriendsApp() {
  const [userPos, setUserPos] = useState(DEFAULT_USER_POS);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState(null);
  const [parentOverride, setParentOverride] = useState(false);
  const [activeFigure, setActiveFigure] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(5);
  const [sessionTime, setSessionTime] = useState(0);

  const selectedLandmark = LANDMARKS.find((l) => l.id === selectedLandmarkId) || null;

  const isNearby = (lm) =>
    parentOverride || haversineDistance(userPos, lm.coords) <= lm.unlockRadius;

  useEffect(() => {
    const t = setInterval(() => setSessionTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleSelectLandmark = (id) => {
    const lm = LANDMARKS.find((l) => l.id === id);
    setSelectedLandmarkId(id);
    if (lm) {
      setMapCenter(lm.coords);
      setMapZoom(15);
    }
  };

  const handleCloseLandmark = () => {
    setSelectedLandmarkId(null);
    setMapCenter(userPos);
    setMapZoom(5);
  };

  const handleTalkToFigure = (figure) => {
    if (figure.agentId) {
      setActiveFigure(figure);
    }
  };

  const handleMapClick = () => {
    if (selectedLandmarkId && !activeFigure) {
      // clicking empty map doesn't deselect — use back button
    }
  };

  // ElevenLabs widget for active figure
  useEffect(() => {
    if (!activeFigure?.agentId) return;

    const existingScript = document.querySelector(
      'script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]'
    );

    const createWidget = () => {
      const existing = document.querySelector("elevenlabs-convai");
      if (existing) existing.remove();
      const widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", activeFigure.agentId);
      document.body.appendChild(widget);
    };

    if (existingScript) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      script.onload = createWidget;
      document.body.appendChild(script);
    }

    return () => {
      const widget = document.querySelector("elevenlabs-convai");
      if (widget) widget.remove();
    };
  }, [activeFigure]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#FAF6EF", height: "100vh", color: "#2C2C3A", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #FAF6EF; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D4CCBC; border-radius: 3px; }
        .leaflet-container { background: #FAF6EF; }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.6; }
        .leaflet-control-zoom { border: 1px solid #E8E0D4 !important; border-radius: 10px !important; overflow: hidden; }
        .leaflet-control-zoom a { color: #5A5A6A !important; background: white !important; border-color: #E8E0D4 !important; }
        elevenlabs-convai { position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 999 !important; }
      `}</style>

      {/* TOP BAR */}
      <header style={{
        background: "white", borderBottom: "1px solid #E8E0D4",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 50, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 20 }}>🕰️</span>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#1A1A2E" }}>Time Friends</span>
          <div style={{ width: 1, height: 24, background: "#E8E0D4", margin: "0 6px" }} />
          <span style={{ fontSize: 12, color: "#8B8070" }}>
            {selectedLandmark ? `${selectedLandmark.icon} ${selectedLandmark.name}` : "Explore the world"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Active figure indicator */}
          {activeFigure && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
              borderRadius: 99, background: `${activeFigure.color}15`, border: `1.5px solid ${activeFigure.color}40`,
            }}>
              <span style={{ fontSize: 16 }}>{activeFigure.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: activeFigure.color }}>
                Speaking with {activeFigure.name}
              </span>
              <button onClick={() => setActiveFigure(null)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#8B8070", marginLeft: 4,
              }}>✕</button>
            </div>
          )}

          {/* Session */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px",
            borderRadius: 99, fontSize: 12, fontWeight: 600, background: "#E8F5E9", color: "#2E7D32",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", display: "inline-block" }} />
            {formatTime(sessionTime)}
          </div>

          {/* Parent override toggle */}
          <div
            onClick={() => setParentOverride(!parentOverride)}
            title="Parent override: unlock all locations"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
              borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: parentOverride ? "#E3F2FD" : "#F5F0E6",
              color: parentOverride ? "#1565C0" : "#8B8070",
              border: `1.5px solid ${parentOverride ? "#90CAF9" : "#E8E0D4"}`,
              transition: "all 0.2s ease", userSelect: "none",
            }}
          >
            <span>{parentOverride ? "🔓" : "🔒"}</span>
            Parent Mode
          </div>

          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "#F5E6D0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            border: "2px solid #E8D4B8", cursor: "pointer",
          }}>👧</div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <aside style={{
          width: selectedLandmark ? 380 : 320, flexShrink: 0,
          borderRight: "1px solid #E8E0D4", background: "#FFFCF7",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "width 0.3s ease",
        }}>
          {selectedLandmark ? (
            <LandmarkDetail
              landmark={selectedLandmark}
              isNearby={isNearby(selectedLandmark)}
              onTalk={handleTalkToFigure}
              onClose={handleCloseLandmark}
            />
          ) : (
            <>
              {/* Landmark browser header */}
              <div style={{
                padding: "18px 20px", borderBottom: "1px solid #F0EBE2",
                background: "linear-gradient(180deg, #FAF6EF 0%, #FFFCF7 100%)",
              }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E", marginBottom: 4 }}>
                  Discover Landmarks
                </div>
                <div style={{ fontSize: 13, color: "#8B8070", lineHeight: 1.5 }}>
                  Explore historical sites around the world. Travel to a landmark to unlock conversations with the people who lived there.
                </div>
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 10,
                  background: "#F5F0E6", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#5A5A6A" }}>
                      {LANDMARKS.length} landmarks · {LANDMARKS.reduce((s, l) => s + l.figures.length, 0)} historical figures
                    </div>
                    <div style={{ fontSize: 11, color: "#A89870", marginTop: 1 }}>
                      {LANDMARKS.filter((l) => isNearby(l)).length} nearby
                    </div>
                  </div>
                </div>
              </div>

              {/* Landmark list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                <LandmarkList
                  landmarks={LANDMARKS}
                  userPos={userPos}
                  parentOverride={parentOverride}
                  selectedId={selectedLandmarkId}
                  onSelect={handleSelectLandmark}
                />
              </div>
            </>
          )}
        </aside>

        {/* MAP */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={userPos}
            zoom={5}
            style={{ width: "100%", height: "100%", zIndex: 1 }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <FlyTo center={mapCenter} zoom={mapZoom} />
            <MapClickHandler onMapClick={handleMapClick} />

            {/* User location */}
            <Marker position={userPos} icon={createUserIcon()} />
            <Circle
              center={userPos}
              radius={800}
              pathOptions={{ color: "#4285F4", weight: 1, fillColor: "#4285F4", fillOpacity: 0.06 }}
            />

            {/* Landmarks */}
            {LANDMARKS.map((lm) => (
              <Marker
                key={lm.id}
                position={lm.coords}
                icon={createLandmarkIcon(lm.icon, lm.color, isNearby(lm), selectedLandmarkId === lm.id)}
                eventHandlers={{ click: () => handleSelectLandmark(lm.id) }}
              />
            ))}

            {/* Unlock radius for selected landmark */}
            {selectedLandmark && (
              <Circle
                center={selectedLandmark.coords}
                radius={selectedLandmark.unlockRadius}
                pathOptions={{
                  color: selectedLandmark.color,
                  weight: 2,
                  fillColor: selectedLandmark.color,
                  fillOpacity: 0.08,
                  dashArray: "6 4",
                }}
              />
            )}
          </MapContainer>

          {/* Map legend overlay */}
          <div style={{
            position: "absolute", bottom: 24, left: 24, zIndex: 400,
            background: "white", borderRadius: 14, padding: "14px 18px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", border: "1px solid #E8E0D4",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Legend</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5A5A6A" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4285F4", border: "2px solid white", boxShadow: "0 0 0 1px #4285F444" }} />
                Your location
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5A5A6A" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", border: "2px solid #2E7D32" }} />
                Unlocked landmark
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#5A5A6A" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", border: "2px solid #E65100" }} />
                Locked — travel there
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
