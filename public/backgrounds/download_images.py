"""
Tourist Destination Background Image Downloader
===============================================
Downloads 1920x1080 background images for 50 tourist destinations
from Wikipedia's public API.

How to run:
  1. Install dependencies:
       pip3 install requests Pillow
  2. Run:
       python3 public/backgrounds/download_images.py

Images are saved into public/backgrounds/.
"""

from io import BytesIO
import os
import time

from PIL import Image
import requests


OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

DESTINATIONS = {
    "palace-of-versailles": "Palace of Versailles",
    "the-colosseum": "Colosseum",
    "the-acropolis": "Acropolis of Athens",
    "stonehenge": "Stonehenge",
    "tower-of-london": "Tower of London",
    "alhambra": "Alhambra",
    "pompeii": "Pompeii",
    "hagia-sophia": "Hagia Sophia",
    "kremlin": "Moscow Kremlin",
    "edinburgh-castle": "Edinburgh Castle",
    "pyramids-of-giza": "Great Pyramid of Giza",
    "valley-of-the-kings": "Valley of the Kings",
    "great-zimbabwe": "Great Zimbabwe",
    "timbuktu": "Timbuktu",
    "lalibela": "Lalibela",
    "carthage": "Carthage",
    "robben-island": "Robben Island",
    "elmina-castle": "Elmina Castle",
    "petra": "Petra",
    "jerusalem-old-city": "Jerusalem",
    "persepolis": "Persepolis",
    "taj-mahal": "Taj Mahal",
    "sigiriya": "Sigiriya",
    "great-wall-of-china": "Great Wall of China",
    "forbidden-city": "Forbidden City",
    "terracotta-army": "Terracotta Army",
    "angkor-wat": "Angkor Wat",
    "kinkaku-ji": "Kinkaku-ji",
    "borobudur": "Borobudur",
    "gyeongbokgung": "Gyeongbokgung",
    "himeji-castle": "Himeji Castle",
    "uluru": "Uluru",
    "waitangi": "Waitangi Treaty Grounds",
    "chichen-itza": "Chichen Itza",
    "teotihuacan": "Teotihuacan",
    "mesa-verde": "Mesa Verde National Park",
    "independence-hall": "Independence Hall",
    "machu-picchu": "Machu Picchu",
    "rapa-nui": "Easter Island",
    "tikal": "Tikal",
    "gettysburg": "Gettysburg battlefield",
    "samarkand": "Samarkand",
    "palace-of-knossos": "Knossos",
    "viking-ship-museum": "Viking Ship Museum, Oslo",
    "forbidden-city-mohenjo-daro": "Mohenjo-daro",
    "great-mosque-djenne": "Great Mosque of Djenné",
    "templo-mayor": "Templo Mayor",
    "tiwanaku": "Tiwanaku",
    "nazca-lines": "Nazca Lines",
    "kilwa-kisiwani": "Kilwa Kisiwani",
}

TARGET_SIZE = (1920, 1080)
HEADERS = {
    "User-Agent": "TimeFriendsBackgroundDownloader/1.0 (educational project)"
}


def get_wikipedia_image_url(page_title: str) -> str | None:
    try:
        response = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "titles": page_title,
                "prop": "pageimages",
                "pithumbsize": 2000,
                "format": "json",
                "pilicense": "any",
            },
            headers=HEADERS,
            timeout=15,
        )
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", {})
        for page_id, page_data in pages.items():
            if page_id == "-1":
                continue
            thumbnail = page_data.get("thumbnail", {})
            if thumbnail.get("source"):
                return thumbnail["source"]
    except requests.RequestException as exc:
        print(f"    Wikipedia API error: {exc}")
    return None


def get_wikimedia_commons_url(search_term: str) -> str | None:
    try:
        search_response = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": search_term,
                "srnamespace": "6",
                "srlimit": "8",
                "format": "json",
            },
            headers=HEADERS,
            timeout=15,
        )
        search_response.raise_for_status()
        results = search_response.json().get("query", {}).get("search", [])

        for result in results:
            title = result.get("title", "")
            if not title.startswith("File:"):
                continue
            ext = title.lower().rsplit(".", 1)[-1]
            if ext not in ("jpg", "jpeg", "png"):
                continue

            info_response = requests.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query",
                    "titles": title,
                    "prop": "imageinfo",
                    "iiprop": "url",
                    "iiurlwidth": 1920,
                    "format": "json",
                },
                headers=HEADERS,
                timeout=15,
            )
            info_response.raise_for_status()
            info_pages = info_response.json().get("query", {}).get("pages", {})
            for info_data in info_pages.values():
                imageinfo = info_data.get("imageinfo", [])
                if imageinfo:
                    url = imageinfo[0].get("thumburl") or imageinfo[0].get("url")
                    if url:
                        return url
    except requests.RequestException as exc:
        print(f"    Commons fallback error: {exc}")
    return None


def download_and_resize(image_url: str, output_path: str, size: tuple[int, int] = TARGET_SIZE) -> bool:
    try:
        response = requests.get(image_url, headers=HEADERS, timeout=30, stream=True)
        response.raise_for_status()

        image = Image.open(BytesIO(response.content)).convert("RGB")
        target_width, target_height = size
        image_width, image_height = image.size

        scale = max(target_width / image_width, target_height / image_height)
        resized_width = int(image_width * scale)
        resized_height = int(image_height * scale)
        image = image.resize((resized_width, resized_height), Image.LANCZOS)

        left = (resized_width - target_width) // 2
        top = (resized_height - target_height) // 2
        image = image.crop((left, top, left + target_width, top + target_height))

        image.save(output_path, "JPEG", quality=92, optimize=True)
        return True
    except Exception as exc:
        print(f"    Image download/save error: {exc}")
        return False


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Time Friends Background Downloader")
    print(f"Output folder: {OUTPUT_DIR}")
    print(f"Target resolution: {TARGET_SIZE[0]}x{TARGET_SIZE[1]}")
    print("=" * 60)

    success_list = []
    failed_list = []
    total = len(DESTINATIONS)

    for index, (destination_id, wiki_title) in enumerate(DESTINATIONS.items(), 1):
        output_path = os.path.join(OUTPUT_DIR, f"{destination_id}.jpg")

        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"[{index:02d}/{total}] Already exists: {destination_id}.jpg ({size // 1024}KB)")
            success_list.append(destination_id)
            continue

        print(f"[{index:02d}/{total}] Fetching: {destination_id}")

        image_url = get_wikipedia_image_url(wiki_title)
        if not image_url:
            print(f"         Trying Wikimedia Commons for '{wiki_title}'...")
            image_url = get_wikimedia_commons_url(wiki_title)

        if not image_url:
            print("         No image found")
            failed_list.append(destination_id)
            continue

        print("         Downloading...")
        if download_and_resize(image_url, output_path):
            size = os.path.getsize(output_path)
            print(f"         Saved ({size // 1024}KB)")
            success_list.append(destination_id)
        else:
            print("         Download failed")
            failed_list.append(destination_id)

        time.sleep(0.4)

    print("\n" + "=" * 60)
    print(f"COMPLETE: {len(success_list)}/{total} images downloaded successfully")
    if failed_list:
        print(f"\nFailed ({len(failed_list)}):")
        for name in failed_list:
            print(f"  - {name}")
    else:
        print("All 50 images downloaded successfully.")


if __name__ == "__main__":
    main()
