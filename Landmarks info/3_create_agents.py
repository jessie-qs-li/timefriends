#!/usr/bin/env python3
"""
Time Friends — ElevenLabs Agent Creator
Reads landmarks.json and creates an ElevenLabs Conversational AI agent
for each figure that doesn't yet have an agentId.

Usage:
    # Step 1: Map voice archetypes to real ElevenLabs voice IDs
    python create_agents.py list-voices --api-key YOUR_KEY

    # Step 2: Edit VOICE_MAP below with your chosen voice IDs

    # Step 3: Create all agents
    python create_agents.py create --api-key YOUR_KEY

    # Step 4: Verify
    python create_agents.py status

Options:
    --dry-run       Preview what would be created without actually calling the API
    --limit N       Only create N agents (for testing)
    --landmark ID   Only create agents for a specific landmark
"""

import json
import sys
import time
import argparse
import urllib.request
import urllib.error

# ═══════════════════════════════════════════════════
#  VOICE MAP
#  Map each archetype to a real ElevenLabs voice ID.
#  Browse voices at: https://elevenlabs.io/voice-library
#  Or use: python create_agents.py list-voices --api-key YOUR_KEY
# ═══════════════════════════════════════════════════

VOICE_MAP = {
    "regal-male":           "JBFqnCBsd6RMkjVDRZzb",  # George — warm captivating storyteller, british
    "regal-female":         "pFZP5JQG7iQjIQuC4Bku",  # Lily — velvety actress, british, confident
    "wise-elder-male":      "pqHfZKP75CvOlQylNhV4",  # Bill — wise, mature, old
    "wise-elder-female":    "Xb7hH8MSUJpSbSDYk0k2",  # Alice — clear engaging educator, british
    "warrior-male":         "SOYHLrjzK2X1ezoPC6cr",  # Harry — fierce warrior, rough
    "warrior-female":       "EXAVITQu4vr4xnSDxMaL",  # Sarah — mature, confident
    "young-leader-male":    "TX3LPaxmHKxFdv7VOQHJ",  # Liam — energetic, young, confident
    "young-leader-female":  "cgSgspJ2msm6clMCkdW9",  # Jessica — playful, bright, warm, young
    "artist-male":          "iP95p4xoKVk53GoZ742B",  # Chris — charming, down-to-earth
    "artist-female":        "FGY2WhTYpPnrIDTdsKH5",  # Laura — enthusiastic, expressive
    "storyteller-male":     "CwhRBWXzGAHq8TQ4Fs17",  # Roger — laid-back, casual, resonant
    "storyteller-female":   "XrExE9yKIg1WjnnlVkGX",  # Matilda — knowledgeable, upbeat
    "mystic-male":          "nPczCjzI2devNBz1zQrb",  # Brian — deep, resonant, comforting
    "mystic-female":        "hpp4J3VqNfWAUOO0d1Us",  # Bella — professional, warm
    "scholar-male":         "onwK4e9ZLuTAKqWW03F9",  # Daniel — steady broadcaster, british, formal
    "scholar-female":       "MClEFoImJXBTgLwdLI5n",  # Ivy — sophisticated, professional
    "commander-male":       "pNInz6obpgDQGcFmaJgB",  # Adam — dominant, firm
    "gentle-elder-male":    "cjVigY5qzO86Huf0OWal",  # Eric — smooth, trustworthy, classy
    "gentle-elder-female":  "EIsgvJT3rwoPvRFG6c4n",  # Clara — natural, convincing, warm
    "trickster":            "N2lVS1w4EtoT3dr4eOWO",  # Callum — husky trickster
}

# ElevenLabs API config
API_BASE = "https://api.elevenlabs.io/v1"
AGENT_MODEL = "claude-3-5-sonnet"  # LLM used by the conversational agent
RATE_LIMIT_DELAY = 1.0  # seconds between API calls


def api_request(method, path, api_key, data=None):
    """Make an API request to ElevenLabs."""
    url = f"{API_BASE}{path}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"  API Error {e.code}: {error_body}")
        return None


def list_voices(api_key):
    """List available ElevenLabs voices to help choose voice IDs."""
    print("Fetching available voices from ElevenLabs...\n")
    result = api_request("GET", "/voices", api_key)
    if not result:
        print("Failed to fetch voices.")
        return

    voices = result.get("voices", [])
    print(f"Found {len(voices)} voices:\n")
    print(f"{'Name':<30} {'Voice ID':<30} {'Category':<15} {'Labels'}")
    print("-" * 100)
    for v in voices:
        name = v.get("name", "?")
        vid = v.get("voice_id", "?")
        cat = v.get("category", "?")
        labels = v.get("labels", {})
        label_str = ", ".join(f"{k}={val}" for k, val in labels.items())
        print(f"{name:<30} {vid:<30} {cat:<15} {label_str}")

    print(f"\n── Copy voice IDs into VOICE_MAP in this script ──")
    print(f"── You need ~20 voices mapped to archetypes ──")


def create_agent(figure, landmark, api_key, dry_run=False):
    """Create a single ElevenLabs conversational AI agent for a figure."""
    voice_id = VOICE_MAP.get(figure["voiceArchetype"])
    agent_name = f"Time Friends - {figure['name']} ({landmark['name']})"

    if not voice_id:
        print(f"  ⚠ Skipping {figure['name']}: no voice ID for archetype '{figure['voiceArchetype']}'")
        return None

    config = {
        "name": agent_name,
        "conversation_config": {
            "agent": {
                "prompt": {
                    "prompt": figure["systemPrompt"]
                },
                "first_message": figure["firstMessage"],
                "language": "en",
            },
            "tts": {
                "voice_id": voice_id,
            },
        },
        "tags": [
            "time-friends",
            f"landmark:{landmark['id']}",
            f"era:{landmark['era']}",
            f"archetype:{figure['voiceArchetype']}",
        ],
    }

    if dry_run:
        print(f"  [DRY RUN] Would create agent: {agent_name}")
        print(f"            Voice: {voice_id} ({figure['voiceArchetype']})")
        print(f"            Prompt length: {len(figure['systemPrompt'])} chars")
        return "dry-run-agent-id"

    print(f"  Creating agent: {agent_name}...")
    result = api_request("POST", "/convai/agents/create", api_key, config)

    if result and "agent_id" in result:
        agent_id = result["agent_id"]
        print(f"  ✓ Created: {agent_id}")
        return agent_id
    else:
        print(f"  ✗ Failed to create agent for {figure['name']}")
        return None


def create_all_agents(api_key, dry_run=False, limit=None, landmark_filter=None):
    """Create agents for all figures in landmarks.json."""
    with open("1_landmarks.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # Check voice map
    unmapped = [k for k, v in VOICE_MAP.items() if v is None]
    if unmapped and not dry_run:
        print(f"ERROR: {len(unmapped)} voice archetypes have no voice ID mapped:")
        for u in unmapped:
            print(f"  - {u}")
        print(f"\nPlease edit VOICE_MAP in this script first.")
        print(f"Run: python create_agents.py list-voices --api-key YOUR_KEY")
        sys.exit(1)

    created = 0
    skipped = 0
    failed = 0

    for landmark in data["landmarks"]:
        if landmark_filter and landmark["id"] != landmark_filter:
            continue

        print(f"\n{'='*60}")
        print(f"📍 {landmark['name']} ({landmark['location']})")
        print(f"{'='*60}")

        for figure in landmark["figures"]:
            if limit and created >= limit:
                print(f"\n── Limit of {limit} reached ──")
                save_data(data)
                return

            if figure.get("agentId"):
                print(f"  ⏭ {figure['name']}: already has agent {figure['agentId']}")
                skipped += 1
                continue

            agent_id = create_agent(figure, landmark, api_key, dry_run)

            if agent_id and not dry_run:
                figure["agentId"] = agent_id
                created += 1
                # Save after each successful creation (crash-safe)
                save_data(data)
                time.sleep(RATE_LIMIT_DELAY)
            elif agent_id:  # dry run
                created += 1
            else:
                failed += 1
                time.sleep(RATE_LIMIT_DELAY)

    if not dry_run:
        save_data(data)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"  Created:  {created}")
    print(f"  Skipped:  {skipped} (already had agent)")
    print(f"  Failed:   {failed}")
    print(f"  Total:    {created + skipped + failed}")


def save_data(data):
    """Save updated 1_landmarks.json with new agent IDs."""
    with open("1_landmarks.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def show_status():
    """Show how many agents have been created."""
    with open("1_landmarks.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    total = 0
    with_agent = 0
    without_agent = 0

    for landmark in data["landmarks"]:
        for figure in landmark["figures"]:
            total += 1
            if figure.get("agentId"):
                with_agent += 1
            else:
                without_agent += 1

    print(f"Agent Creation Status")
    print(f"  Total figures:    {total}")
    print(f"  With agent ID:    {with_agent}")
    print(f"  Without agent ID: {without_agent}")
    print(f"  Progress:         {with_agent}/{total} ({100*with_agent//total}%)")

    if without_agent > 0:
        print(f"\nMissing agents by landmark:")
        for landmark in data["landmarks"]:
            missing = [f["name"] for f in landmark["figures"] if not f.get("agentId")]
            if missing:
                print(f"  {landmark['name']}: {', '.join(missing)}")


def export_for_app(output_path="4_landmarks_app.json"):
    """Export a clean version for the React app (no system prompts, smaller file)."""
    with open("1_landmarks.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    app_data = {"landmarks": []}

    for lm in data["landmarks"]:
        app_landmark = {
            "id": lm["id"],
            "name": lm["name"],
            "location": lm["location"],
            "coordinates": lm["coordinates"],
            "era": lm["era"],
            "description": lm["description"],
            "emoji": lm["emoji"],
            "unlockRadius": lm["unlockRadius"],
            "figures": []
        }

        for fig in lm["figures"]:
            app_fig = {
                "id": fig["id"],
                "name": fig["name"],
                "title": fig["title"],
                "reign": fig["reign"],
                "emoji": fig["emoji"],
                "traits": fig["traits"],
                "previewQuote": fig["previewQuote"],
                "agentId": fig.get("agentId"),
            }
            app_landmark["figures"].append(app_fig)

        app_data["landmarks"].append(app_landmark)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(app_data, f, indent=2, ensure_ascii=False)

    print(f"Exported app data to {output_path}")
    print(f"  (System prompts stripped — smaller file for the frontend)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Time Friends — ElevenLabs Agent Creator")
    parser.add_argument("command", choices=["create", "list-voices", "status", "export"],
                        help="Command to run")
    parser.add_argument("--api-key", help="ElevenLabs API key")
    parser.add_argument("--dry-run", action="store_true", help="Preview without creating")
    parser.add_argument("--limit", type=int, help="Max agents to create")
    parser.add_argument("--landmark", help="Only process a specific landmark ID")

    args = parser.parse_args()

    if args.command == "list-voices":
        if not args.api_key:
            print("ERROR: --api-key required")
            sys.exit(1)
        list_voices(args.api_key)

    elif args.command == "create":
        if not args.api_key and not args.dry_run:
            print("ERROR: --api-key required (or use --dry-run)")
            sys.exit(1)
        create_all_agents(args.api_key, args.dry_run, args.limit, args.landmark)

    elif args.command == "status":
        show_status()

    elif args.command == "export":
        export_for_app()
