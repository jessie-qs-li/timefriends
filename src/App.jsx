import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import rawLandmarks from "./data/landmarks.json";
import ConversationButton, { ConversationSidePanel } from "./ConversationButton";
import StreetViewCamera from "./StreetViewCamera";
import ProfilePanel from "./ProfilePanel";

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
  streetView: lm.streetView || null,
  figures: lm.figures.map((f) => ({
    id: f.id,
    name: f.name,
    title: f.title,
    reign: f.reign,
    emoji: f.emoji,
    portrait: `/figures/${f.id}.jpg`,
    color: COLOR_PALETTE[hashCode(f.id) % COLOR_PALETTE.length],
    agentId: f.agentId || null,
    portraitScale: f.portraitScale || 1,
    traits: f.traits,
    preview: f.previewQuote,
  })),
}));

const TOTAL_FIGURES = LANDMARKS.reduce((s, l) => s + l.figures.length, 0);

const CONTINENT_MAP = {
  "palace-of-versailles": "Europe", "alhambra": "Europe", "edinburgh-castle": "Europe",
  "hagia-sophia": "Europe", "kremlin": "Europe", "palace-of-knossos": "Europe",
  "pompeii": "Europe", "stonehenge": "Europe", "the-acropolis": "Europe",
  "the-colosseum": "Europe", "tower-of-london": "Europe", "viking-ship-museum": "Europe",
  "angkor-wat": "Asia", "borobudur": "Asia", "forbidden-city": "Asia",
  "great-wall-of-china": "Asia", "gyeongbokgung": "Asia", "himeji-castle": "Asia",
  "jerusalem-old-city": "Asia", "kinkaku-ji": "Asia", "mohenjo-daro": "Asia",
  "persepolis": "Asia", "petra": "Asia", "samarkand": "Asia", "sigiriya": "Asia",
  "taj-mahal": "Asia", "terracotta-army": "Asia",
  "carthage": "Africa", "elmina-castle": "Africa", "great-mosque-djenne": "Africa",
  "great-zimbabwe": "Africa", "kilwa-kisiwani": "Africa", "lalibela": "Africa",
  "pyramids-of-giza": "Africa", "robben-island": "Africa", "timbuktu": "Africa",
  "valley-of-the-kings": "Africa",
  "chichen-itza": "North America", "gettysburg": "North America",
  "independence-hall": "North America", "mesa-verde": "North America",
  "templo-mayor": "North America", "teotihuacan": "North America", "tikal": "North America",
  "machu-picchu": "South America", "nazca-lines": "South America",
  "rapa-nui": "South America", "tiwanaku": "South America",
  "uluru": "Oceania", "waitangi": "Oceania",
};

LANDMARKS.forEach((lm) => { lm.continent = CONTINENT_MAP[lm.id] || "Other"; });
const DEFAULT_USER_POS = [48.8566, 2.3522];

/** “World map” view: centered on Valley of the Kings so Europe / Africa / Asia frame together and landmark pins stay visible. */
const VALLEY_OF_THE_KINGS_LM = LANDMARKS.find((l) => l.id === "valley-of-the-kings");
const WORLD_MAP_CENTER = VALLEY_OF_THE_KINGS_LM
  ? [...VALLEY_OF_THE_KINGS_LM.coords]
  : [25.7402, 32.6014];
/** Lower = more world visible (zoom 3 was too Americas-heavy from default center). */
const WORLD_MAP_ZOOM = 2;
const SIDEBAR_PAGE_SIZE = 20;
/** Matches landmark detail column — conversation panel uses the same width. */
const LANDMARK_PANEL_WIDTH = 380;
const DISCOVER_SIDEBAR_WIDTH = 400;

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
  const tri = isSelected ? 11 : 9;
  const ring = isNearby ? `box-shadow: 0 0 0 3px ${color}44, 0 0 12px ${color}66;` : "";
  const glow = isSelected ? `box-shadow: 0 0 0 4px ${color}, 0 0 20px ${color}88;` : ring;
  return L.divIcon({
    className: "",
    iconSize: [size, size + tri],
    iconAnchor: [size / 2, size + tri],
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:white;border:3px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:${isSelected ? 26 : 22}px;cursor:pointer;
        ${glow}
        transition:all 0.2s ease;
      ">${emoji}</div>
      <div style="
        width:0;height:0;margin-top:-2px;
        border-left:${tri - 2}px solid transparent;
        border-right:${tri - 2}px solid transparent;
        border-top:${tri}px solid ${color};
      "></div>
    </div>`,
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
    if (!center) return;
    // Quick zoom-out to world scale; slower zoom-in when focusing a landmark
    const duration = zoom <= 5 ? 0.75 : 1.15;
    map.flyTo(center, zoom, { duration });
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

function LandmarkList({ landmarks, userPos, selectedId, onSelect, searchQuery, continentFilter }) {
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
    if (continentFilter) {
      list = list.filter((lm) => lm.continent === continentFilter);
    }
    return list
      .map((lm) => ({ ...lm, distance: haversineDistance(userPos, lm.coords) }))
      .sort((a, b) => a.distance - b.distance);
  }, [landmarks, userPos, searchQuery, continentFilter]);

  useEffect(() => setVisibleCount(SIDEBAR_PAGE_SIZE), [searchQuery, continentFilter]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisibleCount((v) => Math.min(v + SIDEBAR_PAGE_SIZE, filtered.length));
    }
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div ref={listRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#FFFCF7" }}>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "#8B8070", fontSize: 13 }}>
          No landmarks match "{searchQuery}"
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {visible.map((lm) => {
          const isNearby = lm.distance <= 80467; // 50 miles in meters
          const isSelected = selectedId === lm.id;
          return (
            <div
              key={lm.id}
              onClick={() => onSelect(lm.id)}
              role="button"
              tabIndex={0}
              aria-label={`${lm.name}, ${lm.location}`}
              aria-current={isSelected ? "true" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(lm.id);
                }
              }}
              style={{
                position: "relative",
                height: 150,
                borderRadius: 18,
                overflow: "hidden",
                cursor: "pointer",
                border: "none",
                background: "#FFFCF7",
                boxShadow: isSelected
                  ? `8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff, inset 0 0 0 2px ${lm.color}55`
                  : "8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
            >
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(145deg, ${lm.color}35, ${lm.color}55)`,
              }} />
              <div style={{ position: "absolute", inset: 0 }}>
                <img
                  src={lm.image}
                  alt=""
                  aria-hidden={true}
                  style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%",
                    objectFit: "cover", display: "block",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    const fb = e.target.nextElementSibling;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <span style={{
                  display: "none", position: "absolute", inset: 0,
                  alignItems: "center", justifyContent: "center",
                  fontSize: 40, background: `${lm.color}25`,
                }}>{lm.icon}</span>
              </div>
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.35) 42%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 100%)",
              }} />
              {isSelected && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  boxShadow: `inset 0 0 0 1px ${lm.color}55`,
                  background: `${lm.color}14`,
                }} />
              )}
              {isNearby && (
                <div style={{
                  position: "absolute", top: 10, right: 10, zIndex: 2,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                  padding: "4px 9px", borderRadius: 99,
                  background: "rgba(232, 245, 233, 0.95)",
                  color: "#1B5E20",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                }}>
                  ✓ Nearby
                </div>
              )}
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 1,
                padding: "12px 14px 13px",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3,
              }}>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: "#FFFFFF",
                  lineHeight: 1.25,
                  textShadow: "0 1px 8px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%",
                }}>{lm.name}</div>
                <div style={{
                  fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%",
                }}>{lm.location}</div>
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

function FigureCard({ figure, onConversationState }) {
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
          <div style={{ fontSize: 12, color: figure.color, fontWeight: 600, marginTop: 1 }}>{figure.title.replace(/\s*\(.*?\)\s*$/, "")}</div>
          <div style={{ fontSize: 11, color: "#8B8070", marginTop: 1 }}>{figure.reign}</div>
        </div>
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
        <ConversationButton figure={figure} onConversationState={onConversationState} />
      )}
    </div>
  );
}

// ─── Landmark Detail Panel ──────────────────────────────────────────────────

function LandmarkDetail({ landmark, onClose, onConversationState }) {
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
        </div>

        {/* Text overlay at bottom of image */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "16px 20px",
        }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 29, color: "white",
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
            <FigureCard key={f.id} figure={f} onConversationState={onConversationState} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Google Maps Street View ────────────────────────────────────────────────

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

function buildStreetViewEmbedSrc(landmark) {
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    fov: "90",
  });
  const sv = landmark.streetView;
  if (sv?.pano) {
    params.set("pano", sv.pano);
  } else {
    params.set("location", `${landmark.coords[0]},${landmark.coords[1]}`);
  }
  if (sv?.heading != null) params.set("heading", String(sv.heading));
  if (sv?.pitch != null) params.set("pitch", String(sv.pitch));
  return `https://www.google.com/maps/embed/v1/streetview?${params}`;
}

function StreetViewOverlay({ landmark, onClose }) {
  const [loaded, setLoaded] = useState(false);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 500, background: "#1a1a1a",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.6)", gap: 14, padding: 32, textAlign: "center",
      }}>
        <span style={{ fontSize: 40 }}>{landmark.icon}</span>
        <span style={{ fontSize: 13 }}>Add VITE_GOOGLE_MAPS_API_KEY to .env to enable Street View.</span>
        <button onClick={onClose} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer", fontSize: 13 }}>Close</button>
      </div>
    );
  }

  const src = buildStreetViewEmbedSrc(landmark);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 500, overflow: "hidden",
      animation: "streetViewExpand 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
      transformOrigin: "center",
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 56, zIndex: 10,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
          color: "white", fontSize: 20, lineHeight: 1, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      >×</button>

      {/* Loading shimmer */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, background: "#1a1a1a",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.55)", gap: 14,
        }}>
          <span style={{ fontSize: 40 }}>{landmark.icon}</span>
          <span style={{ fontSize: 13 }}>Loading Street View…</span>
        </div>
      )}

      <iframe
        key={landmark.id}
        src={src}
        title={`Street View — ${landmark.name}`}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allowFullScreen
        loading="eager"
        onLoad={() => setLoaded(true)}
      />

      {/* BeReal-style camera preview */}
      <StreetViewCamera />
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
  const [continentFilter, setContinentFilter] = useState(null);
  const [mapState, setMapState] = useState({ bounds: null, zoom: 3 });
  /** When set, map is hidden and the right region shows the live conversation panel. */
  const [conversationPanel, setConversationPanel] = useState(null);
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tf_profile")) || { name: "", age: "", homeCountry: "" }; }
    catch { return { name: "", age: "", homeCountry: "" }; }
  });
  const [visitHistory, setVisitHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tf_visits")) || []; }
    catch { return []; }
  });

  const handleUpdateProfile = (updated) => {
    setProfile(updated);
    localStorage.setItem("tf_profile", JSON.stringify(updated));
  };

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
    setStreetViewOpen(true);
    if (lm) {
      setMapCenter(lm.coords);
      setMapZoom(15);
    }
    // Record visit
    const entry = { landmarkId: id, timestamp: Date.now() };
    setVisitHistory((prev) => {
      const updated = [entry, ...prev];
      localStorage.setItem("tf_visits", JSON.stringify(updated));
      return updated;
    });
  };

  const handleCloseLandmark = () => {
    setSelectedLandmarkId(null);
    setStreetViewOpen(false);
    setMapCenter([...WORLD_MAP_CENTER]);
    setMapZoom(WORLD_MAP_ZOOM);
  };

  const handleReturnToWorldMap = () => {
    setMapCenter([...WORLD_MAP_CENTER]);
    setMapZoom(WORLD_MAP_ZOOM);
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
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-container { background: #FAF6EF; }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.6; }
        .leaflet-control-zoom { border: 1px solid #E8E0D4 !important; border-radius: 10px !important; overflow: hidden; }
        .leaflet-control-zoom a { color: #5A5A6A !important; background: white !important; border-color: #E8E0D4 !important; }
        @keyframes streetViewExpand {
          from { transform: scale(0.08); opacity: 0; border-radius: 50%; }
          to   { transform: scale(1);    opacity: 1; border-radius: 0; }
        }
      `}</style>

      {/* TOP BAR */}
      <header style={{
        background: "white", borderBottom: "1px solid #E8E0D4",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 50, flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
            />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "#1A1A2E", lineHeight: 1 }}>Wonder</span>
          </div>
          <div style={{ width: 1, height: 24, background: "#E8E0D4", margin: "0 6px" }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: "#3A3A4A" }}>
            {selectedLandmark ? selectedLandmark.name : "Explore the world"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            onClick={() => setShowProfile(true)}
            style={{
              width: 34, height: 34, borderRadius: "50%", background: "#F5E6D0",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #E8D4B8", cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#EDD4B0"; e.currentTarget.style.borderColor = "#C4882D"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#F5E6D0"; e.currentTarget.style.borderColor = "#E8D4B8"; }}
          >
            {profile.name ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#8B7355", letterSpacing: "-0.5px" }}>
                {profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <aside style={{
          width: selectedLandmark ? LANDMARK_PANEL_WIDTH : DISCOVER_SIDEBAR_WIDTH, flexShrink: 0,
          borderRight: "1px solid #E8E0D4", background: "#FFFCF7",
          display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "width 0.3s ease",
        }}>
          {selectedLandmark ? (
            <LandmarkDetail
              landmark={selectedLandmark}
              onClose={handleCloseLandmark}
              onConversationState={setConversationPanel}
            />
          ) : (
            <>
              <div style={{
                padding: "18px 20px 14px", borderBottom: "1px solid #F0EBE2",
                background: "linear-gradient(180deg, #FAF6EF 0%, #FFFCF7 100%)",
              }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E", marginBottom: 2 }}>
                  Discover Landmarks
                </div>
                <div style={{ fontSize: 12, color: "#8B8070", marginBottom: 12 }}>
                  {LANDMARKS.length} landmarks · {TOTAL_FIGURES} historical figures · {nearbyCount} nearby
                </div>
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>

              {/* Continent filter */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 16px 4px" }}>
                {["Africa", "Asia", "Europe", "North America", "South America", "Oceania"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setContinentFilter(continentFilter === c ? null : c)}
                    style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      cursor: "pointer", border: "1px solid",
                      borderColor: continentFilter === c ? "#8B6F47" : "#D6CCBB",
                      background: continentFilter === c ? "#8B6F47" : "transparent",
                      color: continentFilter === c ? "white" : "#7A6A54",
                      transition: "all 0.15s",
                    }}
                  >{c}</button>
                ))}
              </div>

              <LandmarkList
                landmarks={LANDMARKS}
                userPos={userPos}
                selectedId={selectedLandmarkId}
                onSelect={handleSelectLandmark}
                searchQuery={searchQuery}
                continentFilter={continentFilter}
              />
            </>
          )}
        </aside>

        {/* MAP + optional conversation strip (same width as landmark sidebar) */}
        <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative", minWidth: 0, display: "flex", flexDirection: "column" }}>
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

            {streetViewOpen && selectedLandmark && (
              <StreetViewOverlay
                landmark={selectedLandmark}
                onClose={() => setStreetViewOpen(false)}
              />
            )}

            {selectedLandmark && (
              <div style={{
                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 400,
                pointerEvents: "auto",
              }}>
                <button
                  type="button"
                  onClick={handleReturnToWorldMap}
                  style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "10px 18px", borderRadius: 12,
                    border: "1px solid #E8E0D4", background: "rgba(255,255,255,0.96)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    color: "#3A3A4A", cursor: "pointer",
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "white"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.96)"; }}
                >
                  Return to world map
                </button>
              </div>
            )}


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
                  Landmark
                </div>
              </div>
            </div>
          </div>

          {conversationPanel && (
            <aside style={{
              width: LANDMARK_PANEL_WIDTH, flexShrink: 0, height: "100%", minHeight: 0,
              borderLeft: "1px solid #E8E0D4", background: "#FFFCF7",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <ConversationSidePanel
                figure={conversationPanel.figure}
                mode={conversationPanel.mode}
                sessionStatus={conversationPanel.sessionStatus}
                onEnd={conversationPanel.endSession}
              />
            </aside>
          )}
        </div>
      </div>

      {showProfile && (
        <ProfilePanel
          profile={profile}
          visitHistory={visitHistory}
          landmarks={LANDMARKS}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
