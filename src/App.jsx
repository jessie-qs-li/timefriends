import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import rawLandmarks from "./data/landmarks.json";
import ConversationButton from "./ConversationButton";

// ─── Data normalization ─────────────────────────────────────────────────────

const COLOR_PALETTE = [
  "#C4882D", "#B85C3A", "#C9A84C", "#4A7FB5", "#8B6F47",
  "#3A7D44", "#7B6BA0", "#D4738A", "#2B9E9E", "#D4652A",
  "#5A8F5A", "#8B4513", "#6366A0", "#B8860B", "#2E8B57",
  "#CD5C5C", "#4682B4", "#DAA520", "#6B8E23", "#DB7093",
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const LANDMARKS = rawLandmarks.landmarks.map((lm, idx) => ({
  id: lm.id,
  name: lm.name,
  location: lm.location,
  coords: [lm.coordinates.lat, lm.coordinates.lng],
  icon: lm.emoji,
  image: `/landmarks/${lm.id}.jpg`,
  era: lm.era,
  color: COLOR_PALETTE[hashCode(lm.id) % COLOR_PALETTE.length],
  unlockRadius: lm.unlockRadius || 500,
  description: lm.description,
  figures: lm.figures.map((f) => ({
    id: f.id,
    name: f.name,
    title: f.title,
    reign: f.reign,
    emoji: f.emoji,
    portrait: `/figures/${f.id}.jpg`,
    color: COLOR_PALETTE[hashCode(f.id) % COLOR_PALETTE.length],
    agentId: f.agentId || null,
    traits: f.traits,
    preview: f.previewQuote,
  })),
}));

const TOTAL_FIGURES = LANDMARKS.reduce((s, l) => s + l.figures.length, 0);
const DEFAULT_USER_POS = [48.8566, 2.3522];
const SIDEBAR_PAGE_SIZE = 20;

// ─── Utils ──────────────────────────────────────────────────────────────────

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

// ─── Map helpers ────────────────────────────────────────────────────────────

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

function MapBoundsTracker({ onBoundsChange }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      const b = map.getBounds();
      onBoundsChange({ bounds: b, zoom: map.getZoom() });
    };
    handler();
    map.on("moveend", handler);
    map.on("zoomend", handler);
    return () => {
      map.off("moveend", handler);
      map.off("zoomend", handler);
    };
  }, [map, onBoundsChange]);
  return null;
}

// ─── Search bar ─────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#A89870", pointerEvents: "none" }}>🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search landmarks, eras, figures…"
        style={{
          width: "100%", padding: "10px 12px 10px 36px", borderRadius: 10,
          border: "1.5px solid #E8E0D4", background: "white",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif",
          color: "#2C2C3A", outline: "none",
          transition: "border-color 0.2s ease",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#C4882D")}
        onBlur={(e) => (e.target.style.borderColor = "#E8E0D4")}
      />
    </div>
  );
}

// ─── Landmark List Sidebar ──────────────────────────────────────────────────

function LandmarkList({ landmarks, userPos, selectedId, onSelect, searchQuery }) {
  const [visibleCount, setVisibleCount] = useState(SIDEBAR_PAGE_SIZE);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = landmarks;
    if (q) {
      list = landmarks.filter((lm) =>
        lm.name.toLowerCase().includes(q) ||
        lm.location.toLowerCase().includes(q) ||
        lm.era.toLowerCase().includes(q) ||
        lm.figures.some((f) => f.name.toLowerCase().includes(q))
      );
    }
    return list
      .map((lm) => ({ ...lm, distance: haversineDistance(userPos, lm.coords) }))
      .sort((a, b) => a.distance - b.distance);
  }, [landmarks, userPos, searchQuery]);

  useEffect(() => setVisibleCount(SIDEBAR_PAGE_SIZE), [searchQuery]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisibleCount((v) => Math.min(v + SIDEBAR_PAGE_SIZE, filtered.length));
    }
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div ref={listRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#8B8070", fontSize: 13 }}>
          No landmarks match "{searchQuery}"
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((lm) => {
          const isNearby = lm.distance <= 80467; // 50 miles in meters
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
                  overflow: "hidden", position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                }}>
                  <img
                    src={lm.image}
                    alt={lm.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                  <span style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>{lm.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1A2E", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lm.name}</div>
                  <div style={{ fontSize: 11, color: "#8B8070" }}>{lm.location}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {isNearby && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
                      background: "#E8F5E9", color: "#2E7D32",
                    }}>
                      ✓ Nearby
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#A89870", marginTop: isNearby ? 3 : 0 }}>
                    {lm.figures.length} {lm.figures.length === 1 ? "figure" : "figures"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {visibleCount < filtered.length && (
          <div style={{ textAlign: "center", padding: "12px", fontSize: 12, color: "#A89870" }}>
            Showing {visibleCount} of {filtered.length} · scroll for more
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Figure Card ────────────────────────────────────────────────────────────

function FigureCard({ figure }) {
  const isComingSoon = !figure.agentId;

  return (
    <div style={{
      padding: "16px", borderRadius: 14, background: "white",
      border: "1.5px solid #E8E0D4", transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${figure.color}30, ${figure.color}60)`,
          border: `2.5px solid ${figure.color}`,
          overflow: "hidden", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>
          <img
            src={figure.portrait}
            alt={figure.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
          <span style={{ display: "none", position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>{figure.emoji}</span>
        </div>
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

      {isComingSoon ? (
        <button disabled style={{
          marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 10,
          border: "none", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 700, cursor: "not-allowed",
          background: "#F0EBE2", color: "#A89870",
        }}>
          🔜  Coming soon
        </button>
      ) : (
        <ConversationButton figure={figure} />
      )}
    </div>
  );
}

// ─── Landmark Detail Panel ──────────────────────────────────────────────────

function LandmarkDetail({ landmark, isNearby, onClose }) {
  if (!landmark) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ position: "relative", flexShrink: 0, borderBottom: "1px solid #F0EBE2" }}>
        {/* Hero image */}
        <div style={{
          width: "100%", height: 200, overflow: "hidden",
          background: `linear-gradient(135deg, ${landmark.color}30, ${landmark.color}60)`,
        }}>
          <img
            src={landmark.image}
            alt={landmark.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.querySelector(".hero-fallback").style.display = "flex";
            }}
          />
          <div className="hero-fallback" style={{
            display: "none", position: "absolute", inset: 0,
            alignItems: "center", justifyContent: "center", fontSize: 64,
          }}>{landmark.icon}</div>
        </div>

        {/* Dark gradient overlay for text readability */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.7) 100%)",
        }} />

        {/* Top controls */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 8,
            padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: "#3A3A4A", fontFamily: "'DM Sans', sans-serif",
            backdropFilter: "blur(8px)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          }}>← Back</button>
          <div style={{
            fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 99,
            background: isNearby ? "rgba(232,245,233,0.92)" : "rgba(255,243,224,0.92)",
            color: isNearby ? "#2E7D32" : "#E65100",
            backdropFilter: "blur(8px)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}>
            {isNearby ? "✓ Unlocked" : "🔒 Locked — go to location"}
          </div>
        </div>

        {/* Text overlay at bottom of image */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "16px 20px",
        }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "white",
            textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            lineHeight: 1.2,
          }}>{landmark.name}</div>
          <div style={{
            fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4,
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}>{landmark.location} · {landmark.era}</div>
        </div>
      </div>

      {/* Description below the hero */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0EBE2", background: "#FFFCF7" }}>
        <p style={{ fontSize: 13, color: "#5A5A6A", lineHeight: 1.6, margin: 0 }}>{landmark.description}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase",
          letterSpacing: "0.08em", marginBottom: 12,
        }}>
          Historical figures ({landmark.figures.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {landmark.figures.map((f) => (
            <FigureCard key={f.id} figure={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Visible markers (zoom-aware) ───────────────────────────────────────────

function VisibleLandmarkMarkers({ landmarks, mapState, isNearby, selectedId, onSelect }) {
  const visible = useMemo(() => {
    if (!mapState.bounds) return landmarks;
    const { bounds, zoom } = mapState;
    const pad = zoom >= 10 ? 0.5 : zoom >= 6 ? 5 : 180;
    const expanded = bounds.pad(pad / (bounds.getNorth() - bounds.getSouth() || 1));
    return landmarks.filter((lm) => expanded.contains(lm.coords));
  }, [landmarks, mapState]);

  return visible.map((lm) => (
    <Marker
      key={lm.id}
      position={lm.coords}
      icon={createLandmarkIcon(lm.icon, lm.color, isNearby(lm), selectedId === lm.id)}
      eventHandlers={{ click: () => onSelect(lm.id) }}
    />
  ));
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function TimeFriendsApp() {
  const [userPos, setUserPos] = useState(DEFAULT_USER_POS);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(3);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapState, setMapState] = useState({ bounds: null, zoom: 3 });

  const selectedLandmark = LANDMARKS.find((l) => l.id === selectedLandmarkId) || null;

  const isNearby = useCallback(
    () => true,
    []
  );

  const nearbyCount = useMemo(
    () => LANDMARKS.filter((l) => isNearby(l)).length,
    [isNearby]
  );

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

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
    setMapZoom(3);
  };

  const handleBoundsChange = useCallback((state) => {
    setMapState(state);
  }, []);

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
            {selectedLandmark ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img src={selectedLandmark.image} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                {selectedLandmark.name}
              </span>
            ) : "Explore the world"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
          width: selectedLandmark ? 380 : 340, flexShrink: 0,
          borderRight: "1px solid #E8E0D4", background: "#FFFCF7",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "width 0.3s ease",
        }}>
          {selectedLandmark ? (
            <LandmarkDetail
              landmark={selectedLandmark}
              isNearby={isNearby(selectedLandmark)}
              onClose={handleCloseLandmark}
            />
          ) : (
            <>
              <div style={{
                padding: "18px 20px 14px", borderBottom: "1px solid #F0EBE2",
                background: "linear-gradient(180deg, #FAF6EF 0%, #FFFCF7 100%)",
              }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E", marginBottom: 4 }}>
                  Discover Landmarks
                </div>
                <div style={{ fontSize: 13, color: "#8B8070", lineHeight: 1.5, marginBottom: 12 }}>
                  Explore historical sites around the world. Travel to a landmark to unlock conversations with the people who lived there.
                </div>
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 10,
                  background: "#F5F0E6", display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#5A5A6A" }}>
                      {LANDMARKS.length} landmarks · {TOTAL_FIGURES} historical figures
                    </div>
                    <div style={{ fontSize: 11, color: "#A89870", marginTop: 1 }}>
                      {nearbyCount} nearby
                    </div>
                  </div>
                </div>
              </div>

              <LandmarkList
                landmarks={LANDMARKS}
                userPos={userPos}
                selectedId={selectedLandmarkId}
                onSelect={handleSelectLandmark}
                searchQuery={searchQuery}
              />
            </>
          )}
        </aside>

        {/* MAP */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer
            center={userPos}
            zoom={3}
            style={{ width: "100%", height: "100%", zIndex: 1 }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            <FlyTo center={mapCenter} zoom={mapZoom} />
            <MapBoundsTracker onBoundsChange={handleBoundsChange} />

            <Marker position={userPos} icon={createUserIcon()} />
            <Circle
              center={userPos}
              radius={800}
              pathOptions={{ color: "#4285F4", weight: 1, fillColor: "#4285F4", fillOpacity: 0.06 }}
            />

            <VisibleLandmarkMarkers
              landmarks={LANDMARKS}
              mapState={mapState}
              isNearby={isNearby}
              selectedId={selectedLandmarkId}
              onSelect={handleSelectLandmark}
            />

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
