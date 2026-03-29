#!/usr/bin/env python3
"""
Time Friends — Landmark Image Downloader
Downloads one representative image per landmark from Wikimedia Commons.

- No API key needed
- All images are Creative Commons licensed
- Optimized search queries for each landmark
- Saves images as landmark-id.jpg in an output folder

Usage:
    python 5_download_images.py                    # Download all
    python 5_download_images.py --landmark petra   # Download one
    python 5_download_images.py --list             # List all search queries
    python 5_download_images.py --size 600         # Set max width (default 800)
"""

import json
import os
import sys
import time
import argparse
import urllib.request
import urllib.error
import urllib.parse

LANDMARK_QUERIES = {
    # ── Europe ──
    "palace-of-versailles":     "Palace of Versailles garden facade",
    "the-colosseum":            "Colosseum Rome exterior",
    "the-acropolis":            "Acropolis Athens Parthenon",
    "stonehenge":               "Stonehenge sunset Wiltshire",
    "tower-of-london":          "Tower of London Thames",
    "alhambra":                 "Alhambra Court of the Lions Granada",
    "pompeii":                  "Pompeii ruins Vesuvius",
    "hagia-sophia":             "Hagia Sophia Istanbul exterior",
    "kremlin":                  "Moscow Kremlin Red Square",
    "edinburgh-castle":         "Edinburgh Castle Scotland",
    "palace-of-knossos":        "Knossos palace Crete ruins",
    "viking-ship-museum":       "Oseberg Viking ship museum Oslo",

    # ── Africa ──
    "pyramids-of-giza":         "Pyramids of Giza Egypt",
    "valley-of-the-kings":      "Valley of the Kings Luxor Egypt",
    "great-zimbabwe":           "Great Zimbabwe ruins walls",
    "timbuktu":                 "Djinguereber Mosque Timbuktu",
    "lalibela":                 "Church of Saint George Lalibela Ethiopia",
    "carthage":                 "Carthage ruins Tunisia",
    "robben-island":            "Robben Island prison Cape Town",
    "elmina-castle":            "Elmina Castle Ghana",
    "great-mosque-djenne":      "Great Mosque of Djenne Mali",
    "kilwa-kisiwani":           "Kilwa Kisiwani ruins Tanzania",

    # ── Middle East ──
    "petra":                    "Petra Treasury Al-Khazneh Jordan",
    "jerusalem-old-city":       "Jerusalem Old City Dome of the Rock",
    "persepolis":               "Persepolis Gate of All Nations Iran",

    # ── South Asia ──
    "taj-mahal":                "Taj Mahal Agra India",
    "sigiriya":                 "Sigiriya rock fortress Sri Lanka",
    "forbidden-city-mohenjo-daro": "Mohenjo-daro ruins Pakistan",

    # ── East Asia ──
    "great-wall-of-china":      "Great Wall of China Mutianyu",
    "forbidden-city":           "Forbidden City Beijing Hall of Supreme Harmony",
    "terracotta-army":          "Terracotta Army Xian China",
    "angkor-wat":               "Angkor Wat temple sunrise Cambodia",
    "kinkaku-ji":               "Kinkaku-ji Golden Pavilion Kyoto",
    "borobudur":                "Borobudur temple Java Indonesia",
    "gyeongbokgung":            "Gyeongbokgung Palace Seoul",
    "himeji-castle":            "Himeji Castle Japan white heron",

    # ── Oceania ──
    "uluru":                    "Uluru Ayers Rock Australia",
    "waitangi":                 "Waitangi Treaty Grounds New Zealand",

    # ── Americas ──
    "chichen-itza":             "Chichen Itza El Castillo pyramid",
    "teotihuacan":              "Teotihuacan Pyramid of the Sun Mexico",
    "mesa-verde":               "Mesa Verde cliff dwellings Colorado",
    "independence-hall":        "Independence Hall Philadelphia",
    "machu-picchu":             "Machu Picchu panoramic Peru",
    "rapa-nui":                 "Moai statues Easter Island",
    "tikal":                    "Tikal pyramid jungle Guatemala",
    "gettysburg":               "Gettysburg battlefield monument",
    "templo-mayor":             "Templo Mayor ruins Mexico City",
    "tiwanaku":                 "Tiwanaku Gateway of the Sun Bolivia",
    "nazca-lines":              "Nazca Lines hummingbird aerial Peru",

    # ── Central Asia ──
    "samarkand":                "Registan Square Samarkand Uzbekistan",
}

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "landmarks")


def search_wikimedia(query, thumb_width=800):
    params = {
        "action": "query",
        "generator": "search",
        "gsrnamespace": "6",
        "gsrsearch": query,
        "gsrlimit": "5",
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
        return None

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None

    for page_id, page in sorted(pages.items(), key=lambda x: x[0]):
        imageinfo = page.get("imageinfo", [{}])[0]
        mime = imageinfo.get("mime", "")

        if "jpeg" not in mime and "jpg" not in mime and "png" not in mime:
            continue

        thumb_url = imageinfo.get("thumburl")
        full_url = imageinfo.get("url")
        desc_url = imageinfo.get("descriptionurl")

        meta = imageinfo.get("extmetadata", {})
        license_short = meta.get("LicenseShortName", {}).get("value", "Unknown")
        artist = meta.get("Artist", {}).get("value", "Unknown")

        if thumb_url:
            return {
                "thumb_url": thumb_url,
                "full_url": full_url,
                "description_url": desc_url,
                "license": license_short,
                "artist": artist,
                "title": page.get("title", ""),
            }

    return None


USER_AGENT = "TimeFriendsApp/1.0 (educational project; jessie@timefriends.app)"


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


def download_all(thumb_width=800, landmark_filter=None):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    landmark_ids = list(LANDMARK_QUERIES.keys())

    results = {}
    success = 0
    failed = 0

    for landmark_id in landmark_ids:
        if landmark_filter and landmark_id != landmark_filter:
            continue

        query = LANDMARK_QUERIES.get(landmark_id)
        if not query:
            print(f"⚠ No search query for: {landmark_id}")
            failed += 1
            continue

        filepath = os.path.join(OUTPUT_DIR, f"{landmark_id}.jpg")

        if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
            print(f"⏭ {landmark_id}: already exists")
            success += 1
            results[landmark_id] = {"file": filepath, "status": "cached"}
            continue

        print(f"🔍 {landmark_id}: searching \"{query}\"...")
        result = search_wikimedia(query, thumb_width)

        if not result:
            print(f"  ✗ No image found")
            failed += 1
            results[landmark_id] = {"status": "not_found"}
            time.sleep(1)
            continue

        print(f"  📥 Downloading: {result['title']}")
        if download_image(result["thumb_url"], filepath):
            size_kb = os.path.getsize(filepath) / 1024
            print(f"  ✓ Saved: {filepath} ({size_kb:.0f} KB)")
            success += 1
            results[landmark_id] = {
                "file": filepath,
                "source_url": result["description_url"],
                "license": result["license"],
                "artist": result["artist"],
                "status": "downloaded",
            }
        else:
            failed += 1
            results[landmark_id] = {"status": "download_failed"}

        time.sleep(3)

    credits = []
    for lid, info in results.items():
        if info.get("status") in ("downloaded", "cached") and info.get("source_url"):
            credits.append({
                "landmark_id": lid,
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
        print(f"\n  Failed landmarks:")
        for lid, info in results.items():
            if info.get("status") not in ("downloaded", "cached"):
                print(f"    - {lid}: {info.get('status')}")


def list_queries():
    print(f"{'Landmark ID':<35} Search Query")
    print("-" * 80)
    for lid, query in sorted(LANDMARK_QUERIES.items()):
        print(f"{lid:<35} {query}")
    print(f"\n{len(LANDMARK_QUERIES)} landmarks")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download landmark images from Wikimedia Commons")
    parser.add_argument("--landmark", help="Download for a specific landmark ID only")
    parser.add_argument("--size", type=int, default=800, help="Max image width in px (default 800)")
    parser.add_argument("--list", action="store_true", help="List all search queries")

    args = parser.parse_args()

    if args.list:
        list_queries()
    else:
        download_all(thumb_width=args.size, landmark_filter=args.landmark)
