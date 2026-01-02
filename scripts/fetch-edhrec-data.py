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
# Combined from EDHREC year/month/week top 100 lists + classic commanders
TOP_COMMANDERS = [
    # Top tier (all-time popular)
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
    "reyav-master-smith",
    # From EDHREC year/month/week top 100
    "yshtola-nights-blessed",
    "the-wise-mothman",
    "ms-bumbleflower",
    "ulalek-fused-atrocity",
    "vivi-ornitier",
    "teval-the-balanced-scale",
    "baylen-the-haymaker",
    "hakbal-of-the-surging-soul",
    "valgavoth-harrower-of-souls",
    "esika-god-of-the-tree",
    "the-necrobloom",
    "frodo-adventurous-hobbit-sam-loyal-attendant",
    "mr-house-president-and-ceo",
    "voja-jaws-of-the-conclave",
    "aragorn-the-uniter",
    "zhulodok-void-gorger",
    "bello-bard-of-the-brambles",
    "rin-and-seri-inseparable",
    "caesar-legions-emperor",
    "shorikai-genesis-engine",
    "hashaton-scarabs-fist",
    "flubs-the-fool",
    "go-shintai-of-lifes-origin",
    "ghyrson-starn-kelermorph",
    "obeka-splitter-of-seconds",
    "krrik-son-of-yawgmoth",
    "kefka-court-mage",
    "tom-bombadil",
    "oloro-ageless-ascetic",
    "sephiroth-fabled-soldier",
    "ygra-eater-of-all",
    "glarb-calamitys-augur",
    "eriette-of-the-charmed-apple",
    "atla-palani-nest-tender",
    "cloud-ex-soldier",
    "xyris-the-writhing-storm",
    "fire-lord-azula",
    "henzie-toolbox-torre",
    "ezio-auditore-da-firenze",
    "sidar-jabari-of-zhalfir",
    "zaxara-the-exemplary",
    "arabella-abandoned-doll",
    "atraxa-grand-unifier",
    "urza-chief-artificer",
    "captain-nghathrod",
    "hearthhull-the-worldseed",
    "urtet-remnant-of-memnarch",
    "toph-the-first-metalbender",
    "alela-cunning-conqueror",
    "zinnia-valleys-voice",
    "marneus-calgar",
    "alela-artful-provocateur",
    "stella-lee-wild-card",
    "helga-skittish-seer",
    "galadriel-light-of-valinor",
    "aesi-tyrant-of-gyre-strait",
    "aminatou-veil-piercer",
    "belakor-the-dark-master",
    "tovolar-dire-overlord",
    "omnath-locus-of-all",
    "zurgo-stormrender",
    "satya-aetherflux-genius",
    "fynn-the-fangbearer",
    "kotis-the-fangkeeper",
    "etali-primal-conqueror",
    "ureni-of-the-unwritten",
    "avatar-aang",
    "iroh-grand-lotus",
    "jin-sakai-ghost-of-tsushima",
    "atreus-impulsive-son-kratos-stoic-father",
    "fire-lord-zuko",
    "kuja-genome-sorcerer",
    "sokka-tenacious-tactician",
    "tidus-yunas-guardian",
    "terra-herald-of-hope",
    "aloy-savior-of-meridian",
    "choco-seeker-of-paradise",
    "felothar-the-steadfast",
    "katara-the-fearless",
    "kilo-apogee-mind",
    "terra-magical-adept",
    "ragost-deft-gastronaut",
    "kratos-god-of-war",
    "betor-ancestors-voice",
    "the-wandering-minstrel",
    "ozai-the-phoenix-king",
    "tifa-lockhart",
    "eshki-temurs-roar",
    "hope-estheim",
    "aang-at-the-crossroads",
    "cosmic-spider-man",
    "eddie-brock",
    "the-destined-warrior",
    "lightning-army-of-one",
    "norman-osborn",
    "hei-bai-forest-guardian",
    "high-perfect-morcant",
    "toph-hardheaded-teacher",
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
    """Fetch average deck data from EDHREC JSON API."""
    url = f"https://json.edhrec.com/pages/average-decks/{slug}.json"
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


def parse_deck_entry(entry: str) -> tuple[str, int]:
    """Parse a deck entry like '1 Card Name' or '29 Mountain' into (name, quantity)."""
    parts = entry.split(" ", 1)
    if len(parts) == 2 and parts[0].isdigit():
        return (parts[1], int(parts[0]))
    return (entry, 1)


def extract_commander_info(data: dict, slug: str) -> dict | None:
    """Extract relevant commander info from EDHREC average deck response."""
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

        # Extract full deck list from the "deck" array at top level
        # Format: ["1 Card Name", "29 Mountain", ...]
        deck_entries = data.get("deck", [])
        card_list = []

        for entry in deck_entries:
            card_name, quantity = parse_deck_entry(entry)
            # Skip the commander itself (already in the deck data)
            if card_name.lower() != name.lower():
                card_list.append({"name": card_name, "quantity": quantity})

        return {
            "name": name,
            "slug": slug,
            "colorIdentity": color_identity,
            "numDecks": num_decks,
            "cards": card_list,
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
                total_cards = sum(c['quantity'] for c in commander['cards'])
                print(f"  ✓ {commander['name']} ({total_cards} cards in deck)", file=sys.stderr)
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
    total_unique_cards = sum(len(c['cards']) for c in commanders)
    total_card_slots = sum(sum(card['quantity'] for card in c['cards']) for c in commanders)
    avg_deck_size = total_card_slots / len(commanders) if commanders else 0
    print(f"  Total unique card entries: {total_unique_cards}", file=sys.stderr)
    print(f"  Total card slots: {total_card_slots}", file=sys.stderr)
    print(f"  Average deck size: {avg_deck_size:.1f} cards (excluding commander)", file=sys.stderr)
    if commanders:
        print(f"  Most popular: {commanders[0]['name']} ({commanders[0]['numDecks']:,} decks)", file=sys.stderr)


if __name__ == "__main__":
    main()
