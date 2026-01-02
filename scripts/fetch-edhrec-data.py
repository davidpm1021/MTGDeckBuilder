#!/usr/bin/env python3
"""
Fetch ALL commander data from EDHREC and generate commanders.json

Usage:
    python scripts/fetch-edhrec-data.py [--output PATH] [--delay SECONDS]

This script:
1. Fetches all commander slugs by following EDHREC's paginated commander list
2. Fetches the average deck for each commander
3. Saves the full deck lists to commanders.json
"""

import argparse
import json
import time
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError


def fetch_json(url: str) -> dict | None:
    """Fetch JSON from a URL with proper headers."""
    headers = {
        "User-Agent": "MTGDeckBuilder/1.0 (Educational Project)",
        "Accept": "application/json",
    }

    try:
        request = Request(url, headers=headers)
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as e:
        print(f"  HTTP Error {e.code}: {url}", file=sys.stderr)
        return None
    except URLError as e:
        print(f"  URL Error: {url} - {e.reason}", file=sys.stderr)
        return None
    except json.JSONDecodeError as e:
        print(f"  JSON Error: {url} - {e}", file=sys.stderr)
        return None


def fetch_all_commander_slugs(delay: float = 0.3) -> list[str]:
    """Fetch all commander slugs by following EDHREC's pagination."""
    base_url = "https://json.edhrec.com/pages/"
    slugs = []
    seen_slugs = set()

    # Start with the main commanders page
    next_page = "commanders/year.json"
    page_num = 0

    while next_page:
        page_num += 1
        url = base_url + next_page
        print(f"[Page {page_num}] Fetching {next_page}...", file=sys.stderr)

        data = fetch_json(url)
        if not data:
            break

        page_slugs = 0
        next_page = None

        # Handle two different response structures:
        # 1. First page: container.json_dict.cardlists[].cardviews[]
        # 2. Pagination pages: cardviews[] at top level
        if "cardviews" in data:
            # Pagination page structure
            for card in data.get("cardviews", []):
                slug = card.get("sanitized")
                if slug and slug not in seen_slugs:
                    slugs.append(slug)
                    seen_slugs.add(slug)
                    page_slugs += 1
            next_page = data.get("more")
        else:
            # First page structure
            container = data.get("container", {})
            json_dict = container.get("json_dict", {})
            cardlists = json_dict.get("cardlists", [])

            for cardlist in cardlists:
                for card in cardlist.get("cardviews", []):
                    slug = card.get("sanitized")
                    if slug and slug not in seen_slugs:
                        slugs.append(slug)
                        seen_slugs.add(slug)
                        page_slugs += 1
                if cardlist.get("more"):
                    next_page = cardlist.get("more")

        print(f"  Found {page_slugs} new commanders (total: {len(slugs)})", file=sys.stderr)

        if next_page:
            time.sleep(delay)

    return slugs


def parse_deck_entry(entry: str) -> tuple[str, int]:
    """Parse a deck entry like '1 Card Name' or '29 Mountain' into (name, quantity)."""
    parts = entry.split(" ", 1)
    if len(parts) == 2 and parts[0].isdigit():
        return (parts[1], int(parts[0]))
    return (entry, 1)


def fetch_commander_deck(slug: str) -> dict | None:
    """Fetch average deck data for a commander from EDHREC."""
    url = f"https://json.edhrec.com/pages/average-decks/{slug}.json"
    data = fetch_json(url)

    if not data:
        return None

    try:
        container = data.get("container", {})
        json_dict = container.get("json_dict", {})
        card = json_dict.get("card", {})

        name = card.get("name", "")
        if not name:
            return None

        # Extract color identity (convert to WUBRG order)
        raw_colors = card.get("color_identity", [])
        color_order = ["W", "U", "B", "R", "G"]
        color_identity = [c for c in color_order if c in raw_colors]

        # Get deck count
        num_decks = card.get("num_decks", 0)

        # Extract full deck list from the "deck" array at top level
        deck_entries = data.get("deck", [])
        card_list = []

        for entry in deck_entries:
            card_name, quantity = parse_deck_entry(entry)
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


def fetch_all_decks(slugs: list[str], delay: float = 0.3) -> list[dict]:
    """Fetch deck data for all commanders."""
    commanders = []
    total = len(slugs)
    failed = 0

    for i, slug in enumerate(slugs, 1):
        print(f"[{i}/{total}] Fetching {slug}...", file=sys.stderr)

        commander = fetch_commander_deck(slug)
        if commander:
            total_cards = sum(c['quantity'] for c in commander['cards'])
            commanders.append(commander)
            print(f"  ✓ {commander['name']} ({total_cards} cards)", file=sys.stderr)
        else:
            failed += 1
            print(f"  ✗ Failed", file=sys.stderr)

        if i < total:
            time.sleep(delay)

    print(f"\nFetched {len(commanders)} commanders ({failed} failed)", file=sys.stderr)
    return commanders


def main():
    parser = argparse.ArgumentParser(description="Fetch ALL EDHREC commander data")
    parser.add_argument("--output", type=str, default="src/assets/data/commanders.json",
                        help="Output file path")
    parser.add_argument("--delay", type=float, default=0.3,
                        help="Delay between requests in seconds")
    parser.add_argument("--skip-fetch-slugs", action="store_true",
                        help="Skip fetching slugs, use cached slugs file")
    parser.add_argument("--slugs-file", type=str, default="scripts/commander-slugs.json",
                        help="File to cache commander slugs")
    args = parser.parse_args()

    slugs_path = Path(args.slugs_file)

    # Step 1: Get all commander slugs
    if args.skip_fetch_slugs and slugs_path.exists():
        print(f"Loading cached slugs from {slugs_path}...", file=sys.stderr)
        with open(slugs_path) as f:
            slugs = json.load(f)
        print(f"Loaded {len(slugs)} commander slugs", file=sys.stderr)
    else:
        print("Fetching all commander slugs from EDHREC...", file=sys.stderr)
        slugs = fetch_all_commander_slugs(delay=args.delay)

        # Cache slugs for future runs
        slugs_path.parent.mkdir(parents=True, exist_ok=True)
        with open(slugs_path, "w") as f:
            json.dump(slugs, f)
        print(f"Cached {len(slugs)} slugs to {slugs_path}", file=sys.stderr)

    print(f"\nTotal commanders to fetch: {len(slugs)}", file=sys.stderr)
    print(f"Output: {args.output}", file=sys.stderr)
    print("", file=sys.stderr)

    # Step 2: Fetch deck data for each commander
    commanders = fetch_all_decks(slugs, delay=args.delay)

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

    # Summary
    print(f"\nSummary:", file=sys.stderr)
    print(f"  Total commanders: {len(commanders)}", file=sys.stderr)
    total_unique_cards = sum(len(c['cards']) for c in commanders)
    total_card_slots = sum(sum(card['quantity'] for card in c['cards']) for c in commanders)
    avg_deck_size = total_card_slots / len(commanders) if commanders else 0
    print(f"  Total unique card entries: {total_unique_cards}", file=sys.stderr)
    print(f"  Total card slots: {total_card_slots}", file=sys.stderr)
    print(f"  Average deck size: {avg_deck_size:.1f} cards", file=sys.stderr)
    if commanders:
        print(f"  Most popular: {commanders[0]['name']} ({commanders[0]['numDecks']:,} decks)", file=sys.stderr)


if __name__ == "__main__":
    main()
