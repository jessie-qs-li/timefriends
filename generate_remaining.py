"""
Generate soundscapes for remaining landmarks using hardcoded prompts → ElevenLabs only.
No Gemini API needed.

Usage:
  python3 generate_remaining.py
  python3 generate_remaining.py --dry-run
"""

import httpx
import os
import time
import argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "") or os.environ.get("VITE_ELEVENLABS_API_KEY", "")
ELEVENLABS_SOUND_URL = "https://api.elevenlabs.io/v1/sound-generation"
OUTPUT_DIR = Path("./soundscapes")
DEFAULT_DURATION = 10
RETRY_ATTEMPTS = 3
RETRY_DELAY = 5
RATE_LIMIT_DELAY = 3

# Hardcoded soundscape prompts for all remaining landmarks
PROMPTS = {
    "robben_island": (
        "Cold Atlantic wind sweeping across rocky shore. Distant seagulls crying overhead. "
        "Iron cell door creaking and clanging shut. Heavy boots on concrete corridor. "
        "Ocean waves crashing against stone walls. Distant foghorn across the bay."
    ),
    "elmina_castle": (
        "Atlantic waves breaking hard against stone fortress walls. Seagulls crying above. "
        "Rusted iron chains dragging across stone floor. Heavy wooden door groaning. "
        "Wind howling through narrow dungeon vents. Distant drumming from the shore village."
    ),
    "petra": (
        "Dry desert wind echoing through carved sandstone canyon. Camel footsteps on soft sand. "
        "Distant water trickling through ancient channels. Merchants calling in narrow Siq passageway. "
        "Sand grains skittering across rock. Falcon cry high above rose-red cliffs."
    ),
    "jerusalem_old_city": (
        "Church bells ringing across stone rooftops. Muslim call to prayer from distant minaret. "
        "Sandaled feet on worn limestone streets. Market vendors shouting in Arabic. "
        "Pigeons fluttering from ancient walls. Children playing in narrow alleyways. "
        "Incense smoke drifting through archways."
    ),
    "persepolis": (
        "Dry Persian plateau wind sweeping across vast stone terrace. Distant hawk cry. "
        "Sand grains hissing across carved relief panels. Stone column fragments settling. "
        "Sparse desert insects chirping at dusk. Distant camel caravan bells on the plain below."
    ),
    "taj_mahal": (
        "Early morning birds singing across the Yamuna riverbank. Soft footsteps on marble inlay. "
        "Fountain water trickling in the central reflecting pool. Gentle breeze rustling cypress trees. "
        "Distant prayer call from Agra mosque. Pigeons cooing on ornate minarets."
    ),
    "sigiriya": (
        "Tropical jungle birds calling from dense forest below. Wind rushing across high rock plateau. "
        "Cicadas singing in the heat. Distant thunder over Sri Lankan highlands. "
        "Monkeys chattering in the trees. Water dripping in ancient cistern chambers."
    ),
    "great_wall_of_china": (
        "Cold mountain wind whistling through crenellated battlements. Distant watchtower signal drums. "
        "Soldier boots marching on stone walkway. Gravel and dust blowing across the ridge. "
        "Eagles calling over the valley below. Creaking of wooden garrison gate."
    ),
    "forbidden_city": (
        "Imperial courtyard wind sweeping across vast stone plaza. Ceremonial drum beating in the distance. "
        "Bronze bells ringing from pavilion rooftops. Silk robes rustling as court officials pass. "
        "Sparrows nesting under ornate eaves. Incense smoke curling through gate archways."
    ),
    "terracotta_army": (
        "Profound underground silence broken by distant dripping water. Hollow echo of footsteps in earthen vault. "
        "Faint creak of ancient timber supports. Wind seeping through excavation shafts above. "
        "Distant rumble of earth settling. Sparse insects in the dark soil."
    ),
    "angkor_wat": (
        "Tropical jungle pressing close — cicadas, birds, monkeys. Morning mist dripping from stone spires. "
        "Wind through ancient gallery corridors. Monks chanting softly in the distance. "
        "Frogs calling from the reflection moat. Rain beginning to fall on sandstone carvings."
    ),
    "kinkaku_ji": (
        "Raked gravel garden raked in steady rhythm. Koi fish splashing in the mirror pond. "
        "Pine branches swaying in breeze. Temple bell resonating across the garden. "
        "Distant Buddhist chanting. Bamboo water feature clicking and pouring. Birds in the cedar trees."
    ),
    "borobudur": (
        "Tropical morning birdsong across volcanic jungle. Wind through stone bell-shaped stupas. "
        "Monks' sandals on carved stone steps. Distant gamelan music floating up from the valley. "
        "Thunder rumbling over Mount Merapi. Rain pattering on ancient basalt relief panels."
    ),
    "gyeongbokgung": (
        "Royal changing of the guard drums beating in steady cadence. Wind through tiled palace eaves. "
        "Distant court musicians playing gayageum. Footsteps on polished stone courtyard. "
        "Magpies calling over palace walls. Water flowing through royal garden stream."
    ),
    "himeji_castle": (
        "Cherry blossom petals falling onto stone castle path. Spring wind through white plaster walls. "
        "Distant koto music from samurai quarters. Wooden drawbridge creaking. "
        "Crows on the keep roof. Water in the outer moat lapping against stone."
    ),
    "uluru": (
        "Red desert wind across vast open plain. Ancient Aboriginal singing and clapping sticks faint in the distance. "
        "Eagles circling high above sandstone monolith. Sparse dry grass rustling. "
        "Flies buzzing in the heat. Distant thunder over the desert horizon."
    ),
    "waitangi": (
        "Bay of Islands waves lapping on the shore. Wind through pohutukawa trees. "
        "Maori karanga call echoing across the grounds. Distant waka paddles striking water. "
        "Birds in the native bush — tui singing. Flag ropes clinking on the pole."
    ),
    "chichen_itza": (
        "Humid jungle heat with insects droning. Wind through tall grass around the pyramid base. "
        "Quetzal birds calling from the treeline. Distant thunder over the Yucatan. "
        "Stone steps resounding with footsteps. Copal incense smoke in the warm air."
    ),
    "teotihuacan": (
        "Dry highland wind sweeping across the Avenue of the Dead. Distant jaguar roar from the jungle. "
        "Obsidian blades clinking in the market. Conch shell trumpet blaring from the pyramid summit. "
        "Crowds murmuring in the vast ceremonial plaza. Dust rising in swirling eddies."
    ),
    "mesa_verde": (
        "High desert wind through canyon juniper and pinyon. Canyon wren singing its cascading call. "
        "Dry creek bed stones shifting below. Distant thunder over the Colorado plateau. "
        "Corn grinding stones rhythmically working. Smoke from clay hearths in cliff dwellings."
    ),
    "independence_hall": (
        "Horse hooves on cobblestone Philadelphia street. Church bell tolling the hour. "
        "Quill pen scratching on parchment. Heated debate voices echoing in the Assembly Room. "
        "Summer cicadas outside the open windows. Carriage wheels rattling past on Chestnut Street."
    ),
    "machu_picchu": (
        "High Andean wind over cloud forest ridge. Llamas softly snorting on the terraces. "
        "Distant Urubamba river rushing through the canyon below. Condor wings beating overhead. "
        "Morning mist dripping from stone walls. Bird calls from the cloud forest below."
    ),
    "rapa_nui": (
        "South Pacific wind sweeping across open grassland. Waves crashing on volcanic shoreline. "
        "Seabirds calling above the stone moai. Distant drumming from the ceremonial platform. "
        "Grass bending in the constant ocean breeze. Rain on ancient basalt stone."
    ),
    "tikal": (
        "Dense Guatemalan jungle alive with howler monkeys roaring at dawn. Macaws shrieking overhead. "
        "Tropical rain on broad jungle canopy. Distant drums from the ceremonial plaza. "
        "Wind through the high temple doorways. Insects and frogs in the humid darkness below."
    ),
    "gettysburg": (
        "Rolling Pennsylvania countryside with summer wind through wheat fields. Distant cannon rumble. "
        "Infantry drum and fife playing march tempo. Musket fire crackling in waves. "
        "Horses galloping across the field. Smoke drifting. Crow calls over the silent aftermath."
    ),
    "samarkand": (
        "Dry Silk Road wind through tiled archways. Camel bells on the approaching caravan. "
        "Artisans hammering copper in the bazaar. Call to prayer from blue-domed mosque. "
        "Sand grains on the courtyard tiles. Distant water in the garden fountain. "
        "Merchants haggling in Uzbek and Persian."
    ),
    "palace_of_knossos": (
        "Warm Aegean breeze through the palace courtyard. Terracotta jars being moved in the storeroom. "
        "Distant sea waves on the Cretan shore. Bull roaring below in the labyrinthine corridors. "
        "Fresco painters grinding pigment. Olive trees rustling beyond the palace walls."
    ),
    "viking_ship_museum": (
        "Oslo fjord water lapping against wooden hull. Oars rhythmically hitting the water. "
        "Sail canvas cracking in the North Sea wind. Rigging ropes straining under tension. "
        "Crew shouting over the bow spray. Seagulls above the mast. Ice cracking at the prow."
    ),
    "mohenjo_daro": (
        "Indus River wind blowing across the ancient city grid. Potters turning clay on the wheel. "
        "Water flowing through brick drainage channels. Bullock carts on the main street. "
        "Children playing near the great bath. Distant river birds over the floodplain."
    ),
    "great_mosque_djenne": (
        "West African dry season harmattan wind against mud-brick walls. Call to prayer echoing across the town. "
        "Market sounds from the square below. Palm branches rustling. "
        "Wooden scaffolding poles tapping on the facade during annual replastering. Donkeys braying nearby."
    ),
    "templo_mayor": (
        "Aztec ceremonial drums beating in deep rhythm. Conch shell trumpets from the temple summit. "
        "Crowds in the great Tenochtitlan market. Copal incense burning. "
        "Lake Texcoco breeze across the island city. Priests chanting over the stone altar."
    ),
    "tiwanaku": (
        "High Altiplano wind across the Bolivian plateau. Distant thunder over Lake Titicaca. "
        "Stone blocks being moved with rope and wooden rollers. Llama herd bells across the plain. "
        "Condors circling above at altitude. Thin cold air whistling through the Sun Gate."
    ),
    "nazca_lines": (
        "Constant dry Peruvian coastal wind over the pampa plateau. Absolute silence beneath. "
        "Distant condor cry. Sand grains skittering across the etched geoglyph surface. "
        "Sparse desert insects. Wind intensifying into a low moan across the flat expanse."
    ),
    "kilwa_kisiwani": (
        "Indian Ocean surf on the coral island shore. Dhow sail canvas snapping in the trade wind. "
        "Swahili merchants unloading gold and ivory on the dock. Tropical birds in the mangroves. "
        "Waves through the arched ruins of the great mosque. Distant drumming from the mainland."
    ),
}


def generate_soundscape(slug: str, description: str, duration: float = DEFAULT_DURATION) -> bytes:
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": description,
        "duration_seconds": duration,
        "prompt_influence": 0.5,
    }
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            response = httpx.post(ELEVENLABS_SOUND_URL, headers=headers, json=payload, timeout=120)
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
    return b""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--duration", type=float, default=DEFAULT_DURATION)
    args = parser.parse_args()

    if not ELEVENLABS_API_KEY:
        print("❌ Missing ELEVENLABS_API_KEY")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Skip slugs that already have a file
    remaining = {slug: prompt for slug, prompt in PROMPTS.items()
                 if not (OUTPUT_DIR / f"{slug}.mp3").exists()}

    print(f"\n🏛️  Soundscape Generator (no Gemini)")
    print(f"   Remaining: {len(remaining)} / {len(PROMPTS)}")
    print(f"   Mode: {'DRY RUN' if args.dry_run else 'FULL GENERATION'}")
    print(f"{'─' * 60}\n")

    total = len(remaining)
    for i, (slug, prompt) in enumerate(remaining.items(), 1):
        print(f"[{i}/{total}] 🏛️  {slug.replace('_', ' ').title()}")
        print(f"   📝 \"{prompt[:90]}...\"")

        if args.dry_run:
            print()
            continue

        print(f"   🔊 ElevenLabs → generating {args.duration}s soundscape...")
        audio = generate_soundscape(slug, prompt, args.duration)
        if audio:
            path = OUTPUT_DIR / f"{slug}.mp3"
            path.write_bytes(audio)
            print(f"   ✅ Saved → {path} ({len(audio)//1024} KB)")
        else:
            print(f"   ❌ Failed")

        if i < total:
            time.sleep(RATE_LIMIT_DELAY)
        print()

    print("✨ Done!")


if __name__ == "__main__":
    main()
