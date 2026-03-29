#!/usr/bin/env python3
"""
Time Friends — Historical Figure Portrait Downloader
Downloads one portrait per historical figure from Wikimedia Commons.
"""

import json
import os
import sys
import time
import argparse
import re
import urllib.request
import urllib.error
import urllib.parse

FIGURE_QUERIES = {
    # ── Palace of Versailles ──
    "louis-xiv":                "Louis XIV portrait painting",
    "marie-antoinette":         "Marie Antoinette portrait Vigée Le Brun",
    "andre-le-notre":           "André Le Nôtre portrait",

    # ── The Colosseum ──
    "emperor-vespasian":        "Vespasian Roman bust sculpture",
    "gladiator-spartacus":      "Spartacus gladiator engraving",
    "livia-drusilla":           "Livia Drusilla Roman bust",

    # ── The Acropolis ──
    "pericles":                 "Pericles bust marble portrait",
    "socrates":                 "Socrates bust sculpture marble",
    "aspasia":                  "Aspasia bust ancient Greece",

    # ── Stonehenge ──
    "stone-builder":            "Stonehenge neolithic builder illustration",
    "stone-astronomer":         "ancient astronomer stone circle painting",
    "boudica":                  "Boudica queen Iceni painting",

    # ── Tower of London ──
    "william-the-conqueror":    "William the Conqueror portrait painting",
    "anne-boleyn":              "Anne Boleyn portrait painting",
    "guy-fawkes":               "Guy Fawkes portrait engraving",

    # ── Alhambra ──
    "muhammad-v":               "Muhammad V Sultan Granada painting",
    "fatima-al-fihri":          "Fatima al-Fihri portrait illustration",
    "washington-irving":        "Washington Irving portrait painting",

    # ── Pompeii ──
    "pliny-the-elder":          "Pliny the Elder portrait engraving",
    "eumachia":                 "Eumachia Pompeii statue",
    "pompeii-baker":            "Terentius Neo Pompeii fresco bakery",

    # ── Hagia Sophia ──
    "justinian-i":              "Justinian I mosaic Ravenna",
    "theodora":                 "Theodora Byzantine empress mosaic Ravenna",
    "isidore-of-miletus":       "Hagia Sophia architect Byzantine illustration",

    # ── Kremlin ──
    "ivan-the-great":           "Ivan III Russia portrait painting",
    "catherine-the-great":      "Catherine the Great portrait painting Rokotov",
    "andrei-rublev":            "Andrei Rublev icon painter portrait",

    # ── Edinburgh Castle ──
    "mary-queen-of-scots":      "Mary Queen of Scots portrait painting",
    "robert-the-bruce":         "Robert the Bruce portrait King Scotland",
    "greyfriars-bobby-owner":   "Greyfriars Bobby Edinburgh photograph",

    # ── Pyramids of Giza ──
    "pharaoh-khufu":            "Pharaoh Khufu statue ivory",
    "cleopatra":                "Cleopatra VII portrait painting",
    "hemiunu":                  "Hemiunu seated statue Giza",

    # ── Valley of the Kings ──
    "tutankhamun":              "Tutankhamun golden mask",
    "hatshepsut":               "Hatshepsut statue pharaoh",
    "howard-carter":            "Howard Carter Tutankhamun tomb photograph",

    # ── Great Zimbabwe ──
    "mutota":                   "Great Zimbabwe soapstone bird sculpture",
    "zimbabwe-trader":          "Swahili coast trader medieval Africa painting",

    # ── Timbuktu ──
    "mansa-musa":               "Mansa Musa Catalan Atlas portrait",
    "timbuktu-scholar":         "Ahmed Baba Timbuktu scholar portrait",
    "timbuktu-salt-trader":     "Saharan salt caravan trader painting",

    # ── Lalibela ──
    "king-lalibela":            "King Lalibela Ethiopia painting icon",
    "lalibela-carver":          "Lalibela rock carver Ethiopia painting",
    "queen-of-sheba":           "Queen of Sheba painting",

    # ── Carthage ──
    "hannibal-barca":           "Hannibal Barca bust marble portrait",
    "dido":                     "Queen Dido Carthage painting",
    "carthage-sailor":          "Hanno Navigator Carthage illustration",

    # ── Robben Island ──
    "nelson-mandela":           "Nelson Mandela portrait photograph",
    "walter-sisulu":            "Walter Sisulu portrait photograph",
    "ahmed-kathrada":           "Ahmed Kathrada portrait photograph",

    # ── Elmina Castle ──
    "elmina-guide":             "Elmina Castle Ghana guide photograph",
    "yaa-asantewaa":            "Yaa Asantewaa Ashanti queen portrait",
    "nana-esi":                 "Fante woman Ghana traditional painting",

    # ── Great Mosque of Djenné ──
    "djenne-mason":             "Djenné mud mosque mason builder photograph",
    "djenne-scholar":           "West African scholar Islamic manuscript painting",
    "djenne-trader-woman":      "Djenné market trader woman Mali photograph",

    # ── Kilwa Kisiwani ──
    "sultan-ali-ibn-al-hasan":  "Kilwa sultan medieval Swahili illustration",
    "kilwa-coin-maker":         "Kilwa Kisiwani copper coin",
    "ibn-battuta-host":         "Ibn Battuta portrait illustration medieval",

    # ── Petra ──
    "aretas-iv":                "Nabataean King Aretas coin portrait",
    "nabataean-water-engineer": "Nabataean water channel Petra engineering",
    "petra-trader":             "Nabataean incense trader camel relief",

    # ── Jerusalem Old City ──
    "king-solomon":             "King Solomon painting portrait",
    "saladin":                  "Saladin portrait painting sultan",
    "helena":                   "Saint Helena empress painting portrait",

    # ── Persepolis ──
    "cyrus-the-great":          "Cyrus the Great portrait relief Pasargadae",
    "darius-the-great":         "Darius the Great Behistun relief portrait",
    "artemisia-i":              "Artemisia queen Halicarnassus painting",

    # ── Taj Mahal ──
    "shah-jahan":               "Shah Jahan Mughal miniature portrait",
    "mumtaz-mahal":             "Mumtaz Mahal portrait Mughal painting",
    "ustad-ahmad-lahori":       "Mughal architect illustration Taj Mahal",

    # ── Sigiriya ──
    "kashyapa-i":               "Sigiriya fresco maiden painting",
    "sigiriya-painter":         "Sigiriya cloud maiden fresco",
    "sigiriya-garden-designer": "Sigiriya water garden Sri Lanka",

    # ── Mohenjo-daro ──
    "indus-urban-planner":      "Mohenjo-daro priest king statue",
    "indus-bead-maker":         "Indus Valley civilization bead artisan",
    "indus-seal-maker":         "Indus Valley seal unicorn",

    # ── Great Wall of China ──
    "qin-shi-huang":            "Qin Shi Huang emperor portrait painting",
    "hua-mulan":                "Hua Mulan warrior painting",
    "wall-builder":             "Great Wall of China workers painting",

    # ── Forbidden City ──
    "yongle-emperor":           "Yongle Emperor Ming dynasty portrait",
    "empress-dowager-cixi":     "Empress Dowager Cixi photograph portrait",
    "zheng-he":                 "Zheng He admiral portrait painting",

    # ── Terracotta Army ──
    "terracotta-sculptor":      "Terracotta Army warrior face closeup",
    "terracotta-farmer":        "Yang Zhifa farmer terracotta discovery",
    "terracotta-general":       "General Meng Tian Qin dynasty portrait",

    # ── Angkor Wat ──
    "suryavarman-ii":           "Suryavarman II Angkor Wat bas relief",
    "angkor-sculptor":          "Angkor Wat apsara relief carving",
    "jayavarman-vii":           "Jayavarman VII statue portrait head",

    # ── Kinkaku-ji ──
    "ashikaga-yoshimitsu":      "Ashikaga Yoshimitsu portrait painting",
    "murasaki-shikibu":         "Murasaki Shikibu Tale of Genji portrait",
    "zen-monk":                 "Musō Soseki zen monk portrait painting",

    # ── Borobudur ──
    "sailendra-king":           "Sailendra dynasty Borobudur Buddha relief",
    "borobudur-sculptor":       "Borobudur relief sculpture carving",
    "stamford-raffles":         "Stamford Raffles portrait painting",

    # ── Gyeongbokgung ──
    "sejong-the-great":         "King Sejong the Great portrait painting",
    "jang-yeong-sil":           "Jang Yeong-sil Joseon inventor illustration",
    "shin-saimdang":            "Shin Saimdang painting portrait Korean",

    # ── Himeji Castle ──
    "toyotomi-hideyoshi":       "Toyotomi Hideyoshi portrait painting",
    "miyamoto-musashi":         "Miyamoto Musashi self portrait painting",
    "lady-sen":                 "Senhime Lady Sen portrait painting",

    # ── Uluru ──
    "anangu-elder":             "Aboriginal Australian elder ceremony dot painting",
    "anangu-tracker":           "Aboriginal Australian tracker desert painting",
    "anangu-artist":            "Aboriginal Australian dot painting artist",

    # ── Waitangi ──
    "hone-heke":                "Hone Heke Maori chief portrait painting",
    "meri-te-tai-mangakahia":   "Maori woman historical portrait photograph",
    "maori-navigator":          "Kupe Polynesian navigator waka painting",

    # ── Chichén Itzá ──
    "kukulcan-priest":          "Maya priest astronomer painting illustration",
    "maya-scribe":              "Lady Xoc Maya lintel carving",
    "maya-ballplayer":          "Maya ball game player stone relief",

    # ── Teotihuacán ──
    "teotihuacan-architect":    "Teotihuacan mask jade stone",
    "teotihuacan-mural-painter": "Teotihuacan mural painting fresco",
    "teotihuacan-trader":       "Teotihuacan obsidian artifact",

    # ── Mesa Verde ──
    "ancestral-puebloan-builder": "Mesa Verde cliff dwelling ancestral Puebloan",
    "puebloan-potter":          "Ancestral Puebloan pottery Mesa Verde design",
    "puebloan-astronomer":      "Sun dagger Pueblo Bonito petroglyph",

    # ── Independence Hall ──
    "benjamin-franklin":        "Benjamin Franklin portrait painting Duplessis",
    "abigail-adams":            "Abigail Adams portrait painting",
    "james-forten":             "James Forten portrait abolitionist",

    # ── Machu Picchu ──
    "pachacuti":                "Pachacuti Inca emperor portrait illustration",
    "inca-engineer":            "Inca quipu keeper portrait illustration",
    "hiram-bingham":            "Hiram Bingham III Machu Picchu photograph",

    # ── Rapa Nui ──
    "moai-carver":              "Moai carving Easter Island illustration",
    "rapa-nui-navigator":       "Polynesian navigator Pacific canoe painting",
    "rapa-nui-birdman":         "Easter Island birdman Tangata Manu petroglyph",

    # ── Tikal ──
    "jasaw-chan-kawil":          "Jasaw Chan Kawil Tikal Maya lintel",
    "tikal-chocolate-maker":    "Maya cacao chocolate preparation painting",
    "tikal-astronomer":         "Maya astronomer observatory painting",

    # ── Gettysburg ──
    "abraham-lincoln":          "Abraham Lincoln portrait photograph",
    "harriet-tubman":           "Harriet Tubman portrait photograph",
    "joshua-chamberlain":       "Joshua Chamberlain Civil War portrait photograph",

    # ── Templo Mayor ──
    "moctezuma-ii":             "Moctezuma II Aztec emperor portrait painting",
    "aztec-chinampas-farmer":   "Aztec chinampa floating garden illustration",
    "malintzin":                "Malinche Malintzin Aztec painting portrait",

    # ── Tiwanaku ──
    "tiwanaku-architect":       "Tiwanaku Gateway of the Sun stone detail",
    "tiwanaku-farmer":          "Tiwanaku raised field agriculture illustration",
    "tiwanaku-priest":          "Tiwanaku Viracocha staff god relief",

    # ── Nazca Lines ──
    "nazca-line-maker":         "Nazca culture ceramic portrait vessel",
    "nazca-water-finder":       "Nazca aqueduct puquio engineering",
    "nazca-weaver":             "Nazca textile weaving Peru",

    # ── Samarkand ──
    "timur":                    "Timur Tamerlane portrait painting",
    "ulugh-beg":                "Ulugh Beg astronomer portrait painting",
    "silk-road-merchant":       "Sogdian merchant Silk Road painting mural",

    # ── Palace of Knossos ──
    "king-minos":               "King Minos Crete painting illustration",
    "minoan-priestess":         "Minoan snake goddess figurine",
    "minoan-bull-leaper":       "Minoan bull leaping fresco Knossos",

    # ── Viking Ship Museum ──
    "leif-erikson":             "Leif Erikson Viking portrait painting",
    "viking-queen":             "Viking queen Oseberg burial painting",
    "viking-shipbuilder":       "Viking longship builder Norse painting",
}

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "figures")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "landmarks.json")
USER_AGENT = "TimeFriendsApp/1.0 (educational project; jessie@timefriends.app)"


def load_figure_names():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    figure_names = {}
    for landmark in data["landmarks"]:
        for figure in landmark["figures"]:
            figure_names[figure["id"]] = figure["name"]
    return figure_names


FIGURE_NAMES = load_figure_names()


def normalize_name(name):
    return re.sub(r"\s*\([^)]*\)", "", name).strip()


def build_query_candidates(figure_id):
    name = normalize_name(FIGURE_NAMES.get(figure_id, figure_id.replace("-", " ")))
    queries = [
        FIGURE_QUERIES.get(figure_id),
        name,
        f"{name} portrait",
        f"{name} painting",
        f"{name} illustration",
        f"{name} bust",
        f"{name} statue",
        f"{name} mosaic",
    ]
    seen = set()
    deduped = []
    for query in queries:
        if query and query not in seen:
            deduped.append(query)
            seen.add(query)
    return deduped


STOPWORDS = frozenset({
    "the", "and", "for", "king", "queen", "saint", "von", "sir", "lady", "master",
    "general", "with", "from", "that", "who", "his", "her", "was", "are", "not",
})

PORTRAIT_HINTS = (
    "portrait", "bust", "statue", "mosaic", "painting", "engrav", "photograph",
    "miniature", "fresco", "coin", "medal", "relief", "drawing", "tomb", "mask",
)


def word_tokens(text):
    return re.findall(r"[a-z0-9]{3,}", (text or "").lower())


def score_commons_candidate(figure_id, file_title, query_used):
    """Higher is better; <= 0 means reject (likely wrong person / random match)."""
    t = file_title.replace("file:", "").lower()
    name = normalize_name(FIGURE_NAMES.get(figure_id, "")).lower()
    name_toks = [w for w in word_tokens(name) if w not in STOPWORDS]
    if not name_toks:
        name_toks = word_tokens(name)

    curated = FIGURE_QUERIES.get(figure_id, "")
    curated_toks = [w for w in word_tokens(curated) if w not in STOPWORDS and len(w) >= 4]

    name_hits = sum(1 for w in name_toks if w in t)
    curated_hits = sum(1 for w in curated_toks if w in t)
    query_hits = sum(1 for w in word_tokens(query_used) if len(w) >= 4 and w not in STOPWORDS and w in t)

    has_portrait_hint = any(h in t for h in PORTRAIT_HINTS)

    if name_hits < 1:
        return -1.0

    # Ambiguous single short token names (e.g. "Helena", "Amina", "Wei"): require extra evidence
    if len(name_toks) == 1 and len(name_toks[0]) <= 8:
        if curated_hits < 2 and not (name_hits >= 1 and has_portrait_hint):
            return -1.0
        if curated_hits == 0 and name_hits >= 1 and not has_portrait_hint:
            return -1.0

    score = name_hits * 4.0 + curated_hits * 2.0 + query_hits * 1.0
    if has_portrait_hint:
        score += 0.75
    return score


def search_wikimedia_candidates(query, thumb_width=400, limit=10):
    params = {
        "action": "query",
        "generator": "search",
        "gsrnamespace": "6",
        "gsrsearch": query,
        "gsrlimit": str(min(limit, 10)),
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": str(thumb_width),
        "format": "json",
    }

    url = f"{COMMONS_API}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  ✗ Search failed: {e}")
        return []

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return []

    out = []
    for page_id, page in sorted(pages.items(), key=lambda x: x[0]):
        imageinfo = page.get("imageinfo", [{}])[0]
        mime = imageinfo.get("mime", "")

        if "jpeg" not in mime and "jpg" not in mime and "png" not in mime:
            continue

        thumb_url = imageinfo.get("thumburl")
        desc_url = imageinfo.get("descriptionurl")

        meta = imageinfo.get("extmetadata", {})
        license_short = meta.get("LicenseShortName", {}).get("value", "Unknown")
        artist = meta.get("Artist", {}).get("value", "Unknown")

        if thumb_url:
            out.append({
                "thumb_url": thumb_url,
                "description_url": desc_url,
                "license": license_short,
                "artist": artist,
                "title": page.get("title", ""),
            })

    return out


def wikipedia_title_matches_figure(figure_id, page_title):
    t = page_title.lower()
    name = normalize_name(FIGURE_NAMES.get(figure_id, "")).lower()
    toks = [w for w in word_tokens(name) if w not in STOPWORDS and len(w) >= 4]
    if len(toks) >= 2:
        return sum(1 for w in toks if w in t) >= 2
    if len(toks) == 1:
        return toks[0] in t and len(toks[0]) >= 5
    return any(len(w) >= 5 and w in t for w in word_tokens(name))


def search_wikipedia_page_image(query, thumb_width=400):
    params = {
        "action": "query",
        "generator": "search",
        "gsrnamespace": "0",
        "gsrsearch": query,
        "gsrlimit": "3",
        "prop": "pageimages|info",
        "pithumbsize": str(thumb_width),
        "inprop": "url",
        "format": "json",
    }

    url = f"{WIKIPEDIA_API}?{urllib.parse.urlencode(params)}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None

    for _, page in sorted(pages.items(), key=lambda x: x[0]):
        thumbnail = page.get("thumbnail", {})
        thumb_url = thumbnail.get("source")
        if thumb_url:
            return {
                "thumb_url": thumb_url,
                "description_url": page.get("fullurl"),
                "license": "Wikipedia page image",
                "artist": "Unknown",
                "title": page.get("title", ""),
            }

    return None


def search_figure_image(figure_id, thumb_width=400):
    best = None
    best_score = -1.0
    best_query = None

    for query in build_query_candidates(figure_id):
        for cand in search_wikimedia_candidates(query, thumb_width):
            s = score_commons_candidate(figure_id, cand["title"], query)
            if s > best_score:
                best_score = s
                best = cand
                best_query = query

    if best is not None and best_score > 0:
        return best, best_query, "commons"

    curated = FIGURE_QUERIES.get(figure_id)
    if curated:
        for wq in (curated, f"{curated} portrait"):
            result = search_wikipedia_page_image(wq, thumb_width)
            if result and wikipedia_title_matches_figure(figure_id, result["title"]):
                return result, wq, "wikipedia"

    return None, None, None


def download_image(url, filepath, max_retries=3):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                with open(filepath, "wb") as f:
                    f.write(resp.read())
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait = (attempt + 1) * 5
                print(f"  ⏳ Rate limited, waiting {wait}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait)
            else:
                print(f"  ✗ Download failed: {e}")
                return False
        except Exception as e:
            print(f"  ✗ Download failed: {e}")
            return False
    return False


def download_all(thumb_width=400, figure_filter=None, force=False):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    figure_ids = list(FIGURE_QUERIES.keys())

    results = {}
    success = 0
    failed = 0

    for figure_id in figure_ids:
        if figure_filter and figure_id != figure_filter:
            continue

        filepath = os.path.join(OUTPUT_DIR, f"{figure_id}.jpg")

        if not force and os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            print(f"⏭ {figure_id}: already exists")
            success += 1
            results[figure_id] = {"file": filepath, "status": "cached"}
            continue

        print(f"🔍 {figure_id}: searching...")
        result, query, source_type = search_figure_image(figure_id, thumb_width)

        if not result:
            print(f"  ✗ No image found")
            failed += 1
            results[figure_id] = {"status": "not_found"}
            time.sleep(1)
            continue

        print(f"  📥 Downloading from {source_type}: {result['title']} (query: {query})")
        if download_image(result["thumb_url"], filepath):
            size_kb = os.path.getsize(filepath) / 1024
            print(f"  ✓ Saved: {figure_id}.jpg ({size_kb:.0f} KB)")
            success += 1
            results[figure_id] = {
                "file": filepath,
                "source_url": result["description_url"],
                "license": result["license"],
                "artist": result["artist"],
                "status": "downloaded",
            }
        else:
            failed += 1
            results[figure_id] = {"status": "download_failed"}

        time.sleep(3)

    credits = []
    for fid, info in results.items():
        if info.get("status") in ("downloaded", "cached") and info.get("source_url"):
            credits.append({
                "figure_id": fid,
                "file": info.get("file"),
                "source": info.get("source_url"),
                "license": info.get("license"),
                "artist": info.get("artist"),
            })

    if credits:
        credits_path = os.path.join(OUTPUT_DIR, "CREDITS.json")
        with open(credits_path, "w") as f:
            json.dump(credits, f, indent=2)
        print(f"\n📋 Attribution saved to {credits_path}")

    print(f"\n{'='*50}")
    print(f"SUMMARY")
    print(f"{'='*50}")
    print(f"  Downloaded: {success}")
    print(f"  Failed:     {failed}")
    print(f"  Total:      {success + failed}")
    print(f"  Output dir: {OUTPUT_DIR}/")

    if failed > 0:
        print(f"\n  Failed figures:")
        for fid, info in results.items():
            if info.get("status") not in ("downloaded", "cached"):
                print(f"    - {fid}: {info.get('status')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download figure portraits from Wikimedia Commons")
    parser.add_argument("--figure", help="Download for a specific figure ID only")
    parser.add_argument("--size", type=int, default=400, help="Max image width in px (default 400)")
    parser.add_argument("--force", action="store_true", help="Re-download even if file already exists")

    args = parser.parse_args()
    download_all(thumb_width=args.size, figure_filter=args.figure, force=args.force)
