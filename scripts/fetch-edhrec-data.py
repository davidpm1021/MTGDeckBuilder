#!/usr/bin/env python3
"""
Fetch commander data from EDHREC and generate commanders.json

Usage:
    python scripts/fetch-edhrec-data.py [--limit N] [--output PATH]

Options:
    --limit N       Number of commanders to fetch (default: 100)
    --output PATH   Output file path (default: src/assets/data/commanders.json)
"""

import argparse
import json
import time
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError

# Top commanders by popularity (slug format)
# This list can be expanded or fetched dynamically
TOP_COMMANDERS = [
    "the-ur-dragon",
    "edgar-markov",
    "atraxa-praetors-voice",
    "krenko-mob-boss",
    "kaalia-of-the-vast",
    "sauron-the-dark-lord",
    "pantlaza-sun-favored",
    "yuriko-the-tigers-shadow",
    "lathril-blade-of-the-elves",
    "kenrith-the-returned-king",
    "giada-font-of-hope",
    "jodah-the-unifier",
    "nekusar-the-mindrazer",
    "miirym-sentinel-wyrm",
    "isshin-two-heavens-as-one",
    "chatterfang-squirrel-general",
    "muldrotha-the-gravetide",
    "arcades-the-strategist",
    "korvold-fae-cursed-king",
    "prosper-tome-bound",
    "omnath-locus-of-creation",
    "wilhelt-the-rotcleaver",
    "jetmir-nexus-of-revels",
    "ur-dragon",
    "teysa-karlov",
    "anim-pakal-thousandth-moon",
    "sisay-weatherlight-captain",
    "the-first-sliver",
    "najeela-the-blade-blossom",
    "edgar-charmed-groom",
    "toxrill-the-corrosive",
    "sythis-harvests-hand",
    "light-paws-emperors-voice",
    "magda-brazen-outlaw",
    "kinnan-bonder-prodigy",
    "winota-joiner-of-forces",
    "urza-lord-high-artificer",
    "kozilek-the-great-distortion",
    "elesh-norn-grand-cenobite",
    "animar-soul-of-elements",
    "zur-the-enchanter",
    "chulane-teller-of-tales",
    "marwyn-the-nurturer",
    "tymna-the-weaver",
    "thrasios-triton-hero",
    "talrand-sky-summoner",
    "yarok-the-desecrated",
    "kykar-winds-fury",
    "feather-the-redeemed",
    "gishath-suns-avatar",
    "the-gitrog-monster",
    "elenda-the-dusk-rose",
    "ghave-guru-of-spores",
    "breya-etherium-shaper",
    "karlov-of-the-ghost-council",
    "niv-mizzet-parun",
    "aurelia-the-warleader",
    "ezuri-claw-of-progress",
    "karador-ghost-chieftain",
    "sliver-overlord",
    "grenzo-dungeon-warden",
    "derevi-empyrial-tactician",
    "brago-king-eternal",
    "selvala-heart-of-the-wilds",
    "rashmi-eternities-crafter",
    "zacama-primal-calamity",
    "meren-of-clan-nel-toth",
    "maelstrom-wanderer",
    "queen-marchesa",
    "locust-god",
    "scarab-god",
    "purphoros-god-of-the-forge",
    "krark-the-thumbless",
    "sakashima-of-a-thousand-faces",
    "tevesh-szat-doom-of-fools",
    "vial-smasher-the-fierce",
    "rograkh-son-of-rohgahh",
    "ardenn-intrepid-archaeologist",
    "jeska-thrice-reborn",
    "kodama-of-the-east-tree",
    "tormod-the-desecrator",
    "malcolm-keen-eyed-navigator",
    "brallin-skyshark-rider",
    "shabraz-the-skyshark",
    "kess-dissident-mage",
    "reyhan-last-of-the-abzan",
    "ishai-ojutai-dragonspeaker",
    "ikra-shidiqi-the-usurper",
    "tana-the-bloodsower",
    "bruse-tarl-boorish-herder",
    "silas-renn-seeker-adept",
    "akiri-line-slinger",
    "ludevic-necro-alchemist",
    "ravos-soultender",
    "kraum-ludevics-opus",
    "kydele-chosen-of-kruphix",
    "sidar-kondo-of-jamuraa",
    "vial-smasher-the-fierce",
    "reyav-master-smith",
]

# Color identity mapping (WUBRG order)
COLOR_MAP = {
    "W": "W",
    "U": "U",
    "B": "B",
    "R": "R",
    "G": "G",
}

def fetch_commander_data(slug: str) -> dict | None:
    """Fetch commander data from EDHREC JSON API."""
    url = f"https://json.edhrec.com/pages/commanders/{slug}.json"
    headers = {
        "User-Agent": "MTGDeckBuilder/1.0 (Educational Project)",
        "Accept": "application/json",
    }

    try:
        request = Request(url, headers=headers)
        with urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data
    except HTTPError as e:
        print(f"  HTTP Error {e.code}: {slug}", file=sys.stderr)
        return None
    except URLError as e:
        print(f"  URL Error: {slug} - {e.reason}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"  JSON Error: {slug} - {e}", file=sys.stderr)
        return None


def extract_commander_info(data: dict, slug: str) -> dict | None:
    """Extract relevant commander info from EDHREC response."""
    try:
        container = data.get("container", {})
        json_dict = container.get("json_dict", {})
        card = json_dict.get("card", {})

        name = card.get("name", "")
        if not name:
            print(f"  No name found for {slug}", file=sys.stderr)
            return None

        # Extract color identity (convert to WUBRG order)
        raw_colors = card.get("color_identity", [])
        color_order = ["W", "U", "B", "R", "G"]
        color_identity = [c for c in color_order if c in raw_colors]

        # Get deck count
        num_decks = card.get("num_decks", 0)

        # Extract cards from cardlists
        cardlists = json_dict.get("cardlists", [])
        cards = set()

        for cardlist in cardlists:
            cardlist_cards = cardlist.get("cardviews", [])
            for card_view in cardlist_cards:
                card_name = card_view.get("name", "")
                if card_name:
                    cards.add(card_name)

        # Limit to top cards (most commonly included)
        # Sort by inclusion rate if available, otherwise just take first N
        card_list = list(cards)[:99]  # 99 cards + commander = 100

        return {
            "name": name,
            "slug": slug,
            "colorIdentity": color_identity,
            "numDecks": num_decks,
            "cards": sorted(card_list),
        }

    except Exception as e:
        print(f"  Extract error for {slug}: {e}", file=sys.stderr)
        return None


def fetch_all_commanders(slugs: list[str], delay: float = 1.0) -> list[dict]:
    """Fetch data for multiple commanders with rate limiting."""
    commanders = []
    total = len(slugs)

    for i, slug in enumerate(slugs, 1):
        print(f"[{i}/{total}] Fetching {slug}...", file=sys.stderr)

        data = fetch_commander_data(slug)
        if data:
            commander = extract_commander_info(data, slug)
            if commander:
                commanders.append(commander)
                print(f"  ✓ {commander['name']} ({len(commander['cards'])} cards)", file=sys.stderr)
            else:
                print(f"  ✗ Failed to extract data", file=sys.stderr)
        else:
            print(f"  ✗ Failed to fetch", file=sys.stderr)

        # Rate limiting - be respectful to EDHREC
        if i < total:
            time.sleep(delay)

    return commanders


def main():
    parser = argparse.ArgumentParser(description="Fetch EDHREC commander data")
    parser.add_argument("--limit", type=int, default=100, help="Number of commanders to fetch")
    parser.add_argument("--output", type=str, default="src/assets/data/commanders.json", help="Output file path")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests in seconds")
    args = parser.parse_args()

    # Limit the commander list
    slugs = TOP_COMMANDERS[:args.limit]

    print(f"Fetching {len(slugs)} commanders from EDHREC...", file=sys.stderr)
    print(f"Output: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    commanders = fetch_all_commanders(slugs, delay=args.delay)

    # Sort by popularity
    commanders.sort(key=lambda c: c["numDecks"], reverse=True)

    # Create output structure
    output = {
        "updatedAt": datetime.now().strftime("%Y-%m-%d"),
        "commanders": commanders,
    }

    # Write to file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print("", file=sys.stderr)
    print(f"✓ Saved {len(commanders)} commanders to {args.output}", file=sys.stderr)

    # Also print summary
    print(f"\nSummary:", file=sys.stderr)
    print(f"  Total commanders: {len(commanders)}", file=sys.stderr)
    print(f"  Total cards tracked: {sum(len(c['cards']) for c in commanders)}", file=sys.stderr)
    if commanders:
        print(f"  Most popular: {commanders[0]['name']} ({commanders[0]['numDecks']:,} decks)", file=sys.stderr)


if __name__ == "__main__":
    main()
