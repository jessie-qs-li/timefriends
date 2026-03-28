# Time Friends — Product Requirements Document

**Version:** 1.0
**Last updated:** March 28, 2026
**Status:** Prototype

---

## 1. Overview

Time Friends is a location-based educational app for children (ages 5–13) that brings history to life through AI-powered voice conversations with historical figures. Children explore real-world landmarks — like Pokémon Go — and unlock conversations with the people who shaped those places. A child standing at the Palace of Versailles can speak directly with Louis XIV; one visiting the Colosseum can question Julius Caesar.

The product combines physical exploration, age-adaptive learning, and conversational AI to make history feel personal, immersive, and unforgettable.

---

## 2. Problem Statement

History education for children is largely passive — textbooks, videos, and museum plaques deliver facts but rarely spark genuine curiosity. Children learn *about* historical figures but never *from* them. Meanwhile, location-based games have proven that tying digital experiences to physical places creates deep engagement (Pokémon Go, Geocaching), but no product applies this mechanic to education.

**Time Friends bridges this gap:** it gives children a reason to visit real historical sites and rewards them with living, breathing conversations with the people who built, ruled, and shaped those places.

---

## 3. Target Users

| Segment | Description |
|---|---|
| **Primary** | Children ages 5–13 |
| **Secondary** | Parents and guardians (control, oversight, unlock overrides) |
| **Tertiary** | Educators and school trip organizers |

### Age Tiers

| Tier | Ages | Experience |
|---|---|---|
| Early Explorer | 5–7 | Simple words, playful stories, lots of questions, short sessions |
| Adventurer | 8–10 | Richer dialogue, moral reasoning, character-driven learning |
| Young Historian | 11–13 | Nuance, primary sources, complex vocabulary, honest history |

---

## 4. Core Experience

### 4.1 The Map — "Explore the World"

The app opens to a full-screen interactive map centered on the child's current location. Historical landmarks appear as themed markers across the world. The map uses a clean, illustrated cartographic style (CARTO Voyager tiles) to feel approachable, not clinical.

**Key behaviors:**
- The child's live GPS location is shown as a blue dot
- Landmarks are displayed as emoji-styled circular markers with color-coded borders
- Landmarks sort by proximity in the sidebar list
- Tapping a landmark flies the map to that location and opens its detail panel
- A dashed radius circle shows the "unlock zone" around each landmark

### 4.2 Landmarks — "Discover Places"

Each landmark represents a real-world historical site. Landmarks are curated to span eras, continents, and civilizations.

**Initial landmark library:**

| Landmark | Location | Era | Figures |
|---|---|---|---|
| Palace of Versailles | Versailles, France | 17th Century | Louis XIV, Marie Antoinette, André Le Nôtre |
| The Colosseum | Rome, Italy | 1st Century | Julius Caesar, Emperor Nero, Livia Drusilla |
| Pyramids of Giza | Giza, Egypt | 26th Century BC | Pharaoh Khufu, Cleopatra VII |
| The Acropolis | Athens, Greece | 5th Century BC | Pericles, Socrates, Aspasia |
| Great Wall of China | Beijing, China | 7th Century BC – 17th Century | Qin Shi Huang, Hua Mulan |
| Machu Picchu | Cusco, Peru | 15th Century | Pachacuti |

Each landmark includes:
- Name, location, and historical era
- Short description
- A curated library of 1–3+ historical figures
- An unlock radius (default: 500 meters)

### 4.3 Proximity Unlock — "Go There to Meet Them"

This is the core mechanic that ties the digital experience to the physical world.

**Rules:**
- A landmark is **locked** until the child is within its unlock radius (default 500m)
- Locked landmarks display distance (e.g., "4,200km away") and prevent conversations
- **Unlocked** landmarks show a green "Nearby" badge and enable all figure conversations
- The unlock zone is visualized as a dashed circle on the map

**Parent Override:**
- A "Parent Mode" toggle in the top bar instantly unlocks all landmarks regardless of location
- This allows at-home exploration, demo use, and accessibility for children who cannot travel
- The toggle is visible but unobtrusive — designed for the parent, not the child

### 4.4 Historical Figures — "Meet the People"

Each landmark contains a library of historical figures who lived, ruled, or shaped that place. Figures are the heart of the product — they are who the child actually talks to.

**Each figure includes:**
- Name, title, reign/era
- Personality traits (e.g., "Theatrical," "Proud," "Commanding")
- A preview quote that captures their voice
- A conversational AI agent (powered by ElevenLabs)

**Figure card states:**
- **Locked:** "Travel here to unlock" — greyed out, not interactive
- **Unlocked, no agent:** "Coming soon" — visible but not yet voiced
- **Unlocked, agent active:** "Start conversation" — fully interactive with voice AI

### 4.5 Voice Conversations — "Talk to History"

When a child taps "Start conversation" on an unlocked figure, the ElevenLabs Conversational AI widget activates. The figure speaks in character — in their voice, with their personality, about their world.

**Technical integration:**
- ElevenLabs `convai-widget-embed` loaded dynamically
- Each figure has a unique `agent-id` pointing to a configured ElevenLabs Conversational AI agent
- The widget renders as a floating microphone button (bottom-right corner)
- Switching figures tears down the previous agent and spins up the new one
- An active conversation is indicated in the top bar with the figure's emoji and name

**Current agent:**
- Louis XIV (Palace of Versailles): `agent_3801kmv6gtp9fsprs56hz044qw6q`

---

## 5. Information Architecture

```
Map (full screen)
├── Landmark markers (on map)
├── User location (blue dot + radius)
│
├── Left Sidebar
│   ├── Landmark List (default view)
│   │   ├── Sorted by distance
│   │   ├── Shows lock/unlock status
│   │   └── Tap → Landmark Detail
│   │
│   └── Landmark Detail (selected view)
│       ├── Landmark info (name, location, era, description)
│       ├── Lock status
│       └── Historical Figures list
│           └── Figure Card
│               ├── Identity (name, title, reign)
│               ├── Traits
│               ├── Preview quote
│               └── Action button (Talk / Locked / Coming Soon)
│
├── Top Bar
│   ├── Time Friends branding
│   ├── Current context (selected landmark or "Explore the world")
│   ├── Active conversation indicator
│   ├── Session timer
│   ├── Parent Mode toggle
│   └── User avatar
│
└── ElevenLabs Widget (floating, bottom-right)
```

---

## 6. Technical Architecture

### 6.1 Frontend Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 6 |
| Map | Leaflet + react-leaflet |
| Map tiles | CARTO Voyager (OpenStreetMap) |
| Voice AI | ElevenLabs Conversational AI (`convai-widget-embed`) |
| Geolocation | Browser Geolocation API |

### 6.2 Key Technical Decisions

- **No API keys required for map:** CARTO Voyager tiles are free and open, keeping the prototype zero-config
- **Dynamic script loading for ElevenLabs:** The widget script is loaded once and reused; agents are swapped by recreating the `<elevenlabs-convai>` element with a new `agent-id`
- **Haversine distance calculation:** Client-side proximity checks use the haversine formula for accurate great-circle distance
- **GPS fallback:** Defaults to Paris (near Versailles) when geolocation is unavailable, making demos work out of the box

---

## 7. Design Principles

1. **Go there, unlock it.** The physical world is the game board. Digital rewards are earned through real exploration.
2. **History has a voice.** Every figure speaks in character. The child doesn't read about history — they hear it, question it, and engage with it.
3. **Age is a dial, not a gate.** Content adapts fluidly to the child's age — vocabulary, complexity, and tone shift without locking anyone out.
4. **Parents are partners, not gatekeepers.** Parent Mode is a single toggle. No lengthy setup, no separate app. Trust the parent.
5. **The world is the curriculum.** Landmarks and figures are curated across eras, continents, and civilizations. Every child sees themselves in history somewhere.

---

## 8. Future Roadmap

### Phase 2 — Depth
- [ ] Voice agents for all 15 initial historical figures
- [ ] Age-adaptive language calibration passed to each agent as context
- [ ] Conversation modes per figure: Free Chat, Guided Tour, Story Mode, Quiz Quest
- [ ] Session progress tracking (topics explored, depth per topic, time spent)
- [ ] Photo Context — snap a photo at a landmark and the figure comments on it

### Phase 3 — Breadth
- [ ] Expanded landmark library (50+ landmarks across all continents)
- [ ] User-generated landmark suggestions
- [ ] Collectible system — badges, stamps, or "memories" earned per figure/landmark
- [ ] Social features — share discoveries with friends/classmates
- [ ] Educator dashboard for school trip planning

### Phase 4 — Platform
- [ ] Native mobile apps (iOS, Android) with background geolocation
- [ ] Offline mode — pre-download figures for areas with poor connectivity
- [ ] AR layer — see figures "standing" at their landmarks through the camera
- [ ] Multi-language support (figures speak in local languages)
- [ ] Parent analytics — learning reports and conversation summaries

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Avg. session duration | > 8 minutes |
| Landmarks visited per user (monthly) | ≥ 2 |
| Conversations started per landmark visit | ≥ 1.5 |
| Parent override usage | < 40% of sessions (physical exploration preferred) |
| Age calibration engagement | > 60% of users adjust the slider |
| Retention (week 1) | > 50% |

---

## 10. Open Questions

1. **Monetization:** Freemium (X free figures, subscription for full library)? One-time purchase? Institutional licensing for schools?
2. **Safety:** How do we moderate open-ended AI conversations with children? Content filtering, session limits, parent review of transcripts?
3. **Historical accuracy:** How do we handle controversial figures or sensitive historical events across age tiers?
4. **Unlock radius tuning:** 500m is a starting point — should radius vary by landmark type (city landmark vs. remote site)?
5. **Offline experience:** What happens when a child is at a landmark but has no internet? Pre-cached agent responses?
