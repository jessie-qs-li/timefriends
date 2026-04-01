"""
Time Friends — Ambient Soundscape Generator
=============================================
Chains two AI APIs together:
  1. Geimini API → analyzes each landmark & generates a rich audio scene description
  2. ElevenLabs Sound Effects API → turns that description into a generated soundscape

Usage:
  1. Set your Gemini keys:
       export GEMINI_API_KEY="..."
       export ELEVENLABS_API_KEY="xi-..."
  2. Install deps:
       pip install google-generativeai httpx python-dotenv
     Optional: put GEMINI_API_KEY and ELEVENLABS_API_KEY (or VITE_ELEVENLABS_API_KEY) in .env
  3. Run:
       python generate_soundscapes.py
       python generate_soundscapes.py --landmark "Tower of London"   # single landmark
       python generate_soundscapes.py --dry-run                      # preview prompts only
       python generate_soundscapes.py --duration 15                  # 15s clips (default 10)

  Output lands in ./soundscapes/<landmark_slug>.mp3
"""

import google.generativeai as genai
import httpx
import json
import os
import sys
import time
import argparse
import re
from pathlib import Path

# Load .env from project root so keys match the rest of the repo
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

# ─────────────────────────── CONFIG ───────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "") or os.environ.get("VITE_ELEVENLABS_API_KEY", "")
OUTPUT_DIR = Path("./soundscapes")
GEMINI_MODEL = "gemini-2.5-flash"
ELEVENLABS_SOUND_URL = "https://api.elevenlabs.io/v1/sound-generation"

# ElevenLabs sound generation settings
DEFAULT_DURATION = 10        # seconds (ElevenLabs supports up to ~22s)
RETRY_ATTEMPTS = 3
RETRY_DELAY = 5              # seconds between retries
RATE_LIMIT_DELAY = 5         # seconds between API calls to avoid rate limits
GEMINI_RETRY_ATTEMPTS = 5
GEMINI_RETRY_BASE_DELAY = 15  # seconds — free tier is 15 RPM, back off on 429


# ─────────────────────────── LANDMARKS ───────────────────────────

LANDMARKS = [
    {"name": "Palace of Versailles",              "era": "17th-18th century", "region": "France"},
    {"name": "The Colosseum",                     "era": "1st century AD",    "region": "Rome, Italy"},
    {"name": "The Acropolis",                     "era": "5th century BC",    "region": "Athens, Greece"},
    {"name": "Stonehenge",                        "era": "3000-2000 BC",      "region": "Wiltshire, England"},
    {"name": "Tower of London",                   "era": "11th century onward", "region": "London, England"},
    {"name": "The Alhambra",                      "era": "13th-14th century", "region": "Granada, Spain"},
    {"name": "Pompeii",                           "era": "1st century AD",    "region": "Near Naples, Italy"},
    {"name": "Hagia Sophia",                      "era": "6th century AD",    "region": "Istanbul, Turkey"},
    {"name": "The Moscow Kremlin",                "era": "15th century onward", "region": "Moscow, Russia"},
    {"name": "Edinburgh Castle",                  "era": "12th century onward", "region": "Edinburgh, Scotland"},
    {"name": "Pyramids of Giza",                  "era": "2580-2560 BC",     "region": "Giza, Egypt"},
    {"name": "Valley of the Kings",               "era": "1539-1075 BC",     "region": "Luxor, Egypt"},
    {"name": "Great Zimbabwe",                    "era": "11th-15th century", "region": "Masvingo, Zimbabwe"},
    {"name": "Timbuktu",                          "era": "12th-16th century", "region": "Mali"},
    {"name": "Rock-Hewn Churches of Lalibela",    "era": "12th-13th century", "region": "Lalibela, Ethiopia"},
    {"name": "Carthage",                          "era": "9th century BC - 146 BC", "region": "Tunis, Tunisia"},
    {"name": "Robben Island",                     "era": "17th-20th century", "region": "Cape Town, South Africa"},
    {"name": "Elmina Castle",                     "era": "15th century onward", "region": "Elmina, Ghana"},
    {"name": "Petra",                             "era": "4th century BC - 2nd century AD", "region": "Jordan"},
    {"name": "Old City of Jerusalem",             "era": "4000 years of history", "region": "Jerusalem, Israel/Palestine"},
    {"name": "Persepolis",                        "era": "6th-4th century BC", "region": "Fars, Iran"},
    {"name": "Taj Mahal",                         "era": "17th century",      "region": "Agra, India"},
    {"name": "Sigiriya",                          "era": "5th century AD",    "region": "Central Sri Lanka"},
    {"name": "Great Wall of China",               "era": "7th century BC - 17th century AD", "region": "Northern China"},
    {"name": "The Forbidden City",                "era": "15th century onward", "region": "Beijing, China"},
    {"name": "Terracotta Army",                   "era": "3rd century BC",    "region": "Xi'an, China"},
    {"name": "Angkor Wat",                        "era": "12th century",      "region": "Siem Reap, Cambodia"},
    {"name": "Kinkaku-ji (Golden Pavilion)",       "era": "14th century",      "region": "Kyoto, Japan"},
    {"name": "Borobudur",                         "era": "9th century",       "region": "Central Java, Indonesia"},
    {"name": "Gyeongbokgung Palace",              "era": "14th century onward", "region": "Seoul, South Korea"},
    {"name": "Himeji Castle",                     "era": "14th-17th century", "region": "Himeji, Japan"},
    {"name": "Uluru (Ayers Rock)",                "era": "Tens of thousands of years", "region": "Northern Territory, Australia"},
    {"name": "Waitangi Treaty Grounds",           "era": "19th century",      "region": "Bay of Islands, New Zealand"},
    {"name": "Chichén Itzá",                      "era": "6th-13th century",  "region": "Yucatán, Mexico"},
    {"name": "Teotihuacán",                       "era": "1st-7th century AD", "region": "Near Mexico City, Mexico"},
    {"name": "Mesa Verde",                        "era": "6th-13th century",  "region": "Colorado, USA"},
    {"name": "Independence Hall",                 "era": "18th century",      "region": "Philadelphia, USA"},
    {"name": "Machu Picchu",                      "era": "15th century",      "region": "Cusco Region, Peru"},
    {"name": "Rapa Nui (Easter Island)",           "era": "10th-17th century", "region": "Easter Island, Chile"},
    {"name": "Tikal",                             "era": "4th century BC - 10th century AD", "region": "Petén, Guatemala"},
    {"name": "Gettysburg Battlefield",            "era": "1863",              "region": "Pennsylvania, USA"},
    {"name": "Registan Square, Samarkand",        "era": "15th-17th century", "region": "Samarkand, Uzbekistan"},
    {"name": "Palace of Knossos",                 "era": "2000-1400 BC",      "region": "Crete, Greece"},
    {"name": "Viking Ship Museum",                "era": "9th-11th century",  "region": "Oslo, Norway"},
    {"name": "Mohenjo-daro",                      "era": "2500-1900 BC",      "region": "Sindh, Pakistan"},
    {"name": "Great Mosque of Djenné",            "era": "13th century onward", "region": "Djenné, Mali"},
    {"name": "Templo Mayor (Tenochtitlán)",       "era": "14th-16th century", "region": "Mexico City, Mexico"},
    {"name": "Tiwanaku",                          "era": "6th-11th century",  "region": "Western Bolivia"},
    {"name": "Nazca Lines",                       "era": "1st-7th century AD", "region": "Nazca, Peru"},
    {"name": "Ruins of Kilwa Kisiwani",           "era": "9th-16th century",  "region": "Kilwa, Tanzania"},
]


# ─────────────────────────── HELPERS ───────────────────────────

def slugify(name: str) -> str:
    """Convert landmark name to a filesystem-safe slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    return slug


def get_gemini_prompt(landmark: dict) -> str:
    """Build the Gemini prompt that generates the ElevenLabs sound description."""
    return f"""You are an expert historical sound designer. Your job is to write a short, 
vivid TEXT PROMPT that will be sent to an AI sound-effects generator (ElevenLabs) to 
create an ambient soundscape for a historical landmark.

Landmark: {landmark['name']}
Location: {landmark['region']}
Era: {landmark['era']}

Rules for your prompt:
- Describe ONLY sounds — no visuals, no narrative, no music.
- Be specific and layered: foreground sounds + mid-ground + background/atmosphere.
- Keep it under 80 words — the API works best with concise prompts.
- Use evocative, concrete nouns (e.g. "iron hammer on anvil" not "industrial sounds").
- Match the sounds to the historical era, not the modern tourist site.
- Include natural/environmental sounds appropriate to the geography.
- Do NOT include quotation marks around the prompt.

Example (for a medieval port):
Wooden ship hulls creaking against dock ropes. Seagulls crying overhead. Distant 
blacksmith hammer ringing on iron. Waves lapping on stone harbor walls. Merchants 
shouting prices in overlapping voices. Cart wheels grinding over cobblestone. Sail 
canvas flapping in steady coastal wind.

Now write the soundscape prompt for {landmark['name']}:"""


# ─────────────────────────── STEP 1: GEMINI ───────────────────────────

def generate_sound_description(model: genai.GenerativeModel, landmark: dict) -> str:
    """Call Gemini to generate a sound effects prompt for the landmark."""
    for attempt in range(1, GEMINI_RETRY_ATTEMPTS + 1):
        try:
            response = model.generate_content(get_gemini_prompt(landmark))
            return response.text.strip()
        except Exception as e:
            if "429" in str(e) and attempt < GEMINI_RETRY_ATTEMPTS:
                wait = GEMINI_RETRY_BASE_DELAY * attempt
                print(f"      ⏳ Gemini rate limit — waiting {wait}s (attempt {attempt}/{GEMINI_RETRY_ATTEMPTS})")
                time.sleep(wait)
                continue
            raise


# ─────────────────────────── STEP 2: ELEVENLABS ───────────────────────────

def generate_soundscape(description: str, duration: float = DEFAULT_DURATION) -> bytes:
    """Call ElevenLabs Sound Generation API with the Claude-written prompt."""
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": description,
        "duration_seconds": duration,
        "prompt_influence": 0.5,   # balance between prompt adherence and variety
    }

    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            response = httpx.post(
                ELEVENLABS_SOUND_URL,
                headers=headers,
                json=payload,
                timeout=120,       # sound gen can be slow
            )

            if response.status_code == 200:
                return response.content

            elif response.status_code == 429:
                wait = RETRY_DELAY * attempt
                print(f"      ⏳ Rate limited — waiting {wait}s (attempt {attempt}/{RETRY_ATTEMPTS})")
                time.sleep(wait)
                continue

            else:
                print(f"      ❌ ElevenLabs error {response.status_code}: {response.text[:200]}")
                if attempt < RETRY_ATTEMPTS:
                    time.sleep(RETRY_DELAY)
                    continue
                return b""

        except httpx.TimeoutException:
            print(f"      ⏳ Timeout — retrying ({attempt}/{RETRY_ATTEMPTS})")
            time.sleep(RETRY_DELAY)
            continue

    return b""


# ─────────────────────────── MAIN PIPELINE ───────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate historical soundscapes")
    parser.add_argument("--landmark", type=str, help="Generate for a single landmark (partial match)")
    parser.add_argument("--dry-run", action="store_true", help="Only generate Gemini prompts, skip audio")
    parser.add_argument("--duration", type=float, default=DEFAULT_DURATION, help=f"Audio duration in seconds (default {DEFAULT_DURATION})")
    parser.add_argument("--output-dir", type=str, default=str(OUTPUT_DIR), help="Output directory for audio files")
    parser.add_argument("--skip-existing", action="store_true", help="Skip landmarks that already have audio files")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Validate API keys
    if not GEMINI_API_KEY:
        print("❌ Missing GEMINI_API_KEY. Set it with: export GEMINI_API_KEY='...'")
        sys.exit(1)
    if not ELEVENLABS_API_KEY and not args.dry_run:
        print("❌ Missing ELEVENLABS_API_KEY. Set it with: export ELEVENLABS_API_KEY='xi-...'")
        sys.exit(1)

    # Filter landmarks if --landmark flag used
    targets = LANDMARKS
    if args.landmark:
        query = args.landmark.lower()
        targets = [l for l in LANDMARKS if query in l["name"].lower()]
        if not targets:
            print(f"❌ No landmark matching '{args.landmark}'. Available landmarks:")
            for l in LANDMARKS:
                print(f"   • {l['name']}")
            sys.exit(1)

    # Initialize Gemini client
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel(GEMINI_MODEL)

    # Track results for summary
    manifest = []
    total = len(targets)

    print(f"\n🏛️  Time Friends — Soundscape Generator")
    print(f"   Landmarks: {total}")
    print(f"   Duration:  {args.duration}s per clip")
    print(f"   Output:    {output_dir.resolve()}")
    print(f"   Mode:      {'DRY RUN (no audio)' if args.dry_run else 'FULL GENERATION'}")
    print(f"{'─' * 60}\n")

    for i, landmark in enumerate(targets, 1):
        slug = slugify(landmark["name"])
        audio_path = output_dir / f"{slug}.mp3"

        if args.skip_existing and audio_path.exists():
            print(f"[{i}/{total}] ⏭️  {landmark['name']} — already exists, skipping")
            manifest.append({"landmark": landmark["name"], "slug": slug, "status": "skipped"})
            continue

        print(f"[{i}/{total}] 🏛️  {landmark['name']}")

        # ── Step 1: Gemini generates the sound prompt ──
        print(f"   🤖 Gemini → generating sound description...")
        try:
            description = generate_sound_description(gemini_model, landmark)
            print(f"   📝 \"{description[:100]}{'...' if len(description) > 100 else ''}\"")
        except Exception as e:
            print(f"   ❌ Gemini error: {e}")
            manifest.append({"landmark": landmark["name"], "slug": slug, "status": "gemini_error", "error": str(e)})
            continue

        if args.dry_run:
            manifest.append({
                "landmark": landmark["name"],
                "slug": slug,
                "status": "dry_run",
                "prompt": description,
            })
            print()
            continue

        # ── Step 2: ElevenLabs generates the audio ──
        print(f"   🔊 ElevenLabs → generating {args.duration}s soundscape...")
        audio_bytes = generate_soundscape(description, duration=args.duration)

        if audio_bytes:
            audio_path.write_bytes(audio_bytes)
            size_kb = len(audio_bytes) / 1024
            print(f"   ✅ Saved → {audio_path} ({size_kb:.0f} KB)")
            manifest.append({
                "landmark": landmark["name"],
                "slug": slug,
                "status": "success",
                "prompt": description,
                "file": str(audio_path),
                "size_kb": round(size_kb, 1),
            })
        else:
            print(f"   ❌ Failed to generate audio")
            manifest.append({
                "landmark": landmark["name"],
                "slug": slug,
                "status": "elevenlabs_error",
                "prompt": description,
            })

        # Rate limit buffer between landmarks
        if i < total:
            time.sleep(RATE_LIMIT_DELAY)

        print()

    # ── Save manifest ──
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"{'─' * 60}")
    print(f"📋 Manifest saved → {manifest_path}")

    # ── Summary ──
    success = sum(1 for m in manifest if m["status"] == "success")
    skipped = sum(1 for m in manifest if m["status"] == "skipped")
    dry_run = sum(1 for m in manifest if m["status"] == "dry_run")
    errors  = sum(1 for m in manifest if "error" in m["status"])

    print(f"\n📊 Results: {success} generated | {skipped} skipped | {dry_run} dry-run | {errors} errors")

    if args.dry_run:
        print(f"\n💡 Run without --dry-run to generate actual audio files.")

    print(f"\n✨ Done!\n")


if __name__ == "__main__":
    main()