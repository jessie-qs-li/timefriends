import { useState } from "react";

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];

function EditableField({ label, value, onSave, type = "text", placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            autoFocus
            type={type}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: 8,
              border: "1.5px solid #C4882D", background: "white",
              fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              color: "#1A1A2E", outline: "none",
            }}
          />
          <button onClick={commit} style={{
            padding: "7px 12px", borderRadius: 8, border: "none",
            background: "#C4882D", color: "white", fontSize: 12,
            fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => { setDraft(value); setEditing(true); }} style={{ cursor: "pointer" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, color: value ? "#1A1A2E" : "#C4B89A", fontWeight: value ? 500 : 400 }}>
          {value || `Add ${label.toLowerCase()}…`}
        </span>
        <span style={{ fontSize: 11, color: "#C4B89A" }}>✎</span>
      </div>
    </div>
  );
}

function CountryField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft); setEditing(false); };

  if (editing) {
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Home Country</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            autoFocus
            type="text"
            value={draft}
            placeholder="e.g. United States"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: 8,
              border: "1.5px solid #C4882D", background: "white",
              fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              color: "#1A1A2E", outline: "none",
            }}
          />
          <button onClick={commit} style={{
            padding: "7px 12px", borderRadius: 8, border: "none",
            background: "#C4882D", color: "white", fontSize: 12,
            fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => { setDraft(value); setEditing(true); }} style={{ cursor: "pointer" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8B8070", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Home Country</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, color: value ? "#1A1A2E" : "#C4B89A", fontWeight: value ? 500 : 400 }}>
          {value || "Add home country…"}
        </span>
        <span style={{ fontSize: 11, color: "#C4B89A" }}>✎</span>
      </div>
    </div>
  );
}

function formatVisitDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProfilePanel({ profile, visitHistory, landmarks, onUpdateProfile, onClose }) {
  const initials = profile.name
    ? profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Deduplicate: keep most recent visit per landmark
  const dedupedVisits = Object.values(
    visitHistory.reduce((acc, v) => {
      if (!acc[v.landmarkId] || v.timestamp > acc[v.landmarkId].timestamp) {
        acc[v.landmarkId] = v;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.timestamp - a.timestamp);

  const visitedLandmarks = dedupedVisits.map((v) => ({
    ...v,
    landmark: landmarks.find((l) => l.id === v.landmarkId),
  })).filter((v) => v.landmark);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "stretch", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      />

      {/* Panel */}
      <div style={{
        position: "relative", width: 400, height: "100%",
        background: "#FFFCF7", borderLeft: "1px solid #E8E0D4",
        display: "flex", flexDirection: "column", overflow: "hidden",
        animation: "slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: "20px 24px 18px", borderBottom: "1px solid #F0EBE2",
          background: "linear-gradient(180deg, #FAF6EF 0%, #FFFCF7 100%)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "#1A1A2E" }}>
            My Profile
          </span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "#8B8070", lineHeight: 1, padding: 4,
            borderRadius: 6,
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* Avatar + identity */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
            padding: "16px 20px", borderRadius: 16, background: "#FAF6EF",
            border: "1px solid #F0EBE2",
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: "linear-gradient(135deg, #C4882D, #E6A84A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, color: "white",
              flexShrink: 0, letterSpacing: "-0.5px",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", lineHeight: 1.3 }}>
                {profile.name || <span style={{ color: "#C4B89A", fontWeight: 400, fontStyle: "italic" }}>No name set</span>}
              </div>
              {(profile.age || profile.homeCountry) && (
                <div style={{ fontSize: 12, color: "#8B8070", marginTop: 3 }}>
                  {[profile.age && `Age ${profile.age}`, profile.homeCountry].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>

          {/* Editable fields */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 18,
            padding: "16px 20px", borderRadius: 16, background: "white",
            border: "1px solid #F0EBE2", marginBottom: 28,
          }}>
            <EditableField
              label="Name"
              value={profile.name}
              placeholder="Your name"
              onSave={(v) => onUpdateProfile({ ...profile, name: v })}
            />
            <div style={{ borderTop: "1px solid #F5F0E6" }} />
            <EditableField
              label="Age"
              value={profile.age}
              placeholder="Your age"
              type="number"
              onSave={(v) => onUpdateProfile({ ...profile, age: v })}
            />
            <div style={{ borderTop: "1px solid #F5F0E6" }} />
            <CountryField
              value={profile.homeCountry}
              onSave={(v) => onUpdateProfile({ ...profile, homeCountry: v })}
            />
          </div>

          {/* Visit history */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#8B8070",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
            }}>
              Places visited ({visitedLandmarks.length})
            </div>

            {visitedLandmarks.length === 0 ? (
              <div style={{
                padding: "32px 20px", borderRadius: 16, background: "#FAF6EF",
                border: "1px dashed #E0D8CC", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
                <div style={{ fontSize: 13, color: "#8B8070", lineHeight: 1.5 }}>
                  No landmarks visited yet.<br />
                  Click on any landmark to explore it!
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visitedLandmarks.map(({ landmark, timestamp }) => (
                  <div key={landmark.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 14, background: "white",
                    border: "1px solid #F0EBE2",
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      overflow: "hidden", background: `${landmark.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22,
                    }}>
                      <img
                        src={landmark.image}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
                      />
                      <span style={{ display: "none" }}>{landmark.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {landmark.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#8B8070", marginTop: 2 }}>
                        {landmark.location}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "#A89870", flexShrink: 0, textAlign: "right" }}>
                      {formatVisitDate(timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
