# MTG Deck Builder - Technical Specification

## Project Overview

A web application that helps Magic: The Gathering players discover which Commander decks they can build with their existing card collection. Users upload/paste their collection, and the app compares it against average decklists from EDHREC to show buildability percentages.

**Target Users:** MTG players with collections in Archidekt, Moxfield, or spreadsheets who want to find buildable Commander decks without manual cross-referencing.

**Core Value Proposition:** "Show me what I can build" - a feature repeatedly requested but not implemented by existing tools due to database complexity. We sidestep this by comparing against cached average decklists rather than millions of individual decks.

---

## User Stories

### US-1: Collection Import

**As a** player with cards tracked in Archidekt  
**I want to** paste or upload my collection export  
**So that** the app knows what cards I own

**Acceptance Criteria:**

- [ ] Accepts plain text (one card per line)
- [ ] Accepts quantity formats: "4 Lightning Bolt", "4x Lightning Bolt"
- [ ] Accepts CSV format (Archidekt export compatible)
- [ ] Handles card names case-insensitively
- [ ] Strips special characters for fuzzy matching
- [ ] Shows count of unique cards parsed
- [ ] Persists collection in localStorage between sessions

### US-1b: Archidekt URL Import

**As a** player who tracks my collection in Archidekt  
**I want to** paste an Archidekt deck URL to import my cards  
**So that** I don't have to manually export and paste CSV

**Acceptance Criteria:**

- [ ] Accepts Archidekt deck URLs (e.g., `https://archidekt.com/decks/123456`)
- [ ] Extracts deck ID from URL and fetches via Archidekt API
- [ ] Parses card names and quantities from API response
- [ ] Shows loading state while fetching
- [ ] Handles errors gracefully (invalid URL, private deck, network issues)
- [ ] Displays helpful message if deck is private or not found

**Implementation Notes:**

- Archidekt collections are private (no public API). Workaround: user creates a public deck containing their collection.
- API endpoint: `https://archidekt.com/api/decks/{id}/`
- Response includes `cards` array with `card.oracleCard.name` and `quantity`
- Must handle CORS: use proxy or fetch from client with appropriate headers
- Rate limit: be respectful, cache results in localStorage with timestamp

### US-2: Deck Matching

**As a** player who has imported my collection  
**I want to** see Commander decks ranked by how buildable they are  
**So that** I can find decks I'm close to completing

**Acceptance Criteria:**

- [ ] Calculates % match against each commander's average decklist
- [ ] Shows owned card count vs total deck size
- [ ] Shows count of missing cards
- [ ] Ranks by buildability percentage (default)
- [ ] Updates in real-time as collection changes

### US-3: Filtering and Sorting

**As a** player browsing buildable decks  
**I want to** filter by color identity and minimum percentage  
**So that** I can narrow down to relevant options

**Acceptance Criteria:**

- [ ] Filter by color identity (W/U/B/R/G) - inclusive (must contain selected colors)
- [ ] Filter by minimum buildability percentage (25/50/70/90%)
- [ ] Sort by: % buildable, cards owned, fewest missing, popularity
- [ ] Filters combine (AND logic)
- [ ] Results update instantly on filter change

### US-4: Deck Details

**As a** player interested in a specific commander  
**I want to** see which cards I own vs need to buy  
**So that** I can decide whether to build it

**Acceptance Criteria:**

- [ ] Expandable card showing owned cards (green)
- [ ] Shows missing cards (muted)
- [ ] Links to EDHREC page for full deck research
- [ ] Limits displayed cards with "+N more" overflow

### US-5: Data Freshness

**As a** user  
**I want to** know when the deck data was last updated  
**So that** I can trust the recommendations are current

**Acceptance Criteria:**

- [ ] Shows "Data updated: [date]" in footer
- [ ] Commander data cached in static JSON file
- [ ] Separate script to refresh data from EDHREC (not part of web app)

---

## Architecture

### Component Hierarchy

```
AppComponent
├── HeaderComponent
│   └── Logo, tagline
├── CollectionInputComponent
│   ├── TabSelectorComponent (paste/upload/url)
│   ├── TextareaComponent
│   ├── FileUploadComponent
│   ├── ArchidektUrlComponent
│   └── CollectionStatsComponent
├── FiltersComponent
│   ├── ColorFilterComponent
│   ├── MinPercentSelectComponent
│   └── SortSelectComponent
├── ResultsComponent
│   ├── ResultsHeaderComponent
│   └── CommanderGridComponent
│       └── CommanderCardComponent (repeated)
│           ├── ProgressBarComponent
│           └── DeckDetailsComponent (conditional)
└── FooterComponent
```

### Services

**CollectionService**

- `parseCollection(text: string): Map<string, number>` - normalize and parse input
- `collection: Signal<Map<string, number>>` - reactive collection state
- `uniqueCardCount: Signal<number>` - computed count
- Handles localStorage persistence

**ArchidektService**

- `fetchDeck(deckId: string): Promise<ArchidektCard[]>` - fetch deck from API
- `extractDeckId(url: string): string | null` - parse URL to get ID
- `isValidArchidektUrl(url: string): boolean` - URL validation
- Handles caching fetched decks in localStorage with timestamp

**CommanderService**

- `commanders: Signal<Commander[]>` - loaded from JSON
- `loadCommanders(): Promise<void>` - fetch and cache
- `dataUpdatedAt: Signal<string>` - metadata from JSON

**DeckMatcherService**

- `calculateMatch(deck: string[], collection: Map<string, number>): MatchResult`
- `getFilteredResults(commanders, collection, filters): Signal<MatchedCommander[]>`
- Pure computation, no state

### Data Models

```typescript
interface Commander {
  name: string;
  slug: string;
  colorIdentity: ("W" | "U" | "B" | "R" | "G")[];
  numDecks: number;
  cards: string[];
}

interface MatchResult {
  percent: number;
  owned: number;
  total: number;
  missing: number;
  ownedCards: string[];
  missingCards: string[];
}

interface MatchedCommander {
  commander: Commander;
  match: MatchResult;
}

interface Filters {
  colors: ("W" | "U" | "B" | "R" | "G")[];
  minPercent: number;
  sortBy: "percent" | "owned" | "missing" | "popularity";
}

/** Response shape from Archidekt API */
interface ArchidektDeckResponse {
  id: number;
  name: string;
  cards: ArchidektCardEntry[];
}

interface ArchidektCardEntry {
  quantity: number;
  card: {
    oracleCard: {
      name: string;
    };
  };
}

/** Cached Archidekt deck with timestamp */
interface CachedArchidektDeck {
  fetchedAt: string;
  deckId: string;
  cards: { name: string; quantity: number }[];
}
```

### Data Flow

```
[JSON File] → CommanderService.commanders
                      ↓
[User Input] → CollectionService.parseCollection → CollectionService.collection
                      ↓                                    ↓
              FiltersComponent.filters ────────────────────┤
                      ↓                                    ↓
              DeckMatcherService.getFilteredResults(commanders, collection, filters)
                      ↓
              ResultsComponent → CommanderCardComponent[]
```

---

## Technical Requirements

### Framework & Build

- Angular 19 (latest stable)
- Standalone components (no NgModules)
- Signals for all reactive state
- OnPush change detection everywhere
- Native control flow (@if, @for, @switch)
- inject() function for DI
- Vite-based build (Angular 19 default)

### Styling

- Tailwind CSS 4 (integrated via Angular CLI)
- Dark theme (MTG-inspired: blacks, golds)
- CSS custom properties for theming
- Mobile-responsive (single column on small screens)

### Testing

- Jest for unit tests
- Testing Library for component tests
- 80%+ coverage on services
- Property-based tests for parser edge cases

### Performance Targets

- Initial load < 2s on 3G
- Collection parse < 100ms for 10,000 cards
- Filter updates < 16ms (60fps)
- Lazy load commander data only when needed

### Browser Support

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## File Structure

```
MTGDeckBuilder/
├── .claude/
│   └── PROJECT.md
├── .cursor/
│   └── mcp.json
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── collection.service.ts
│   │   │   │   ├── commander.service.ts
│   │   │   │   └── deck-matcher.service.ts
│   │   │   └── models/
│   │   │       └── types.ts
│   │   ├── features/
│   │   │   ├── collection-input/
│   │   │   │   ├── collection-input.component.ts
│   │   │   │   └── collection-input.component.spec.ts
│   │   │   ├── filters/
│   │   │   │   ├── filters.component.ts
│   │   │   │   └── color-filter.component.ts
│   │   │   └── results/
│   │   │       ├── results.component.ts
│   │   │       ├── commander-card.component.ts
│   │   │       └── progress-bar.component.ts
│   │   ├── shared/
│   │   │   └── components/
│   │   └── app.component.ts
│   ├── assets/
│   │   └── data/
│   │       └── commanders.json
│   ├── styles.css
│   └── main.ts
├── scripts/
│   └── fetch-edhrec-data.py
├── CLAUDE.md
├── spec.md
└── README.md
```

---

## Worker Agent Task Breakdown

### Worker 1: Collection Parser Service

**Branch:** `feature/collection-parser`

**Deliverables:**

- `src/app/core/services/collection.service.ts`
- `src/app/core/services/collection.service.spec.ts`
- `src/app/core/services/archidekt.service.ts`
- `src/app/core/services/archidekt.service.spec.ts`

**Requirements:**

- Parse plain text, quantity formats, CSV
- Normalize card names (lowercase, strip special chars)
- Return Map<normalizedName, quantity>
- Signal-based state with localStorage persistence
- Property-based tests for parser edge cases
- Archidekt URL validation and deck fetching
- Cache Archidekt responses in localStorage (24h TTL)

**Test Cases - Collection Parsing:**

- Plain list: "Lightning Bolt\nCounterspell"
- Quantities: "4 Lightning Bolt", "4x Lightning Bolt"
- CSV: "4,Lightning Bolt,2XM"
- Mixed formats in same input
- Unicode characters in card names
- Empty lines and comments (#, //)
- Case insensitivity
- Cards with commas in names
- Cards with // in names (split cards)

**Test Cases - Archidekt Import:**

- Valid URL: `https://archidekt.com/decks/123456`
- Valid URL with slug: `https://archidekt.com/decks/123456/my-deck-name`
- Invalid URL: `https://example.com/decks/123`
- Non-numeric ID
- API error handling (404, network failure)
- Cached response retrieval
- Cache expiration

---

### Worker 2: Commander Data Service

**Branch:** `feature/commander-service`

**Deliverables:**

- `src/app/core/services/commander.service.ts`
- `src/app/core/services/commander.service.spec.ts`
- `src/app/core/services/deck-matcher.service.ts`
- `src/app/core/services/deck-matcher.service.spec.ts`
- `src/app/core/models/types.ts`

**Requirements:**

- Load commanders.json on app init
- Expose as Signal<Commander[]>
- DeckMatcherService as pure functions
- Computed signals for filtered/sorted results

**Test Cases:**

- JSON loading and parsing
- Match calculation accuracy
- Filter by single color
- Filter by multiple colors (AND)
- Filter by minimum percent
- Sort by each option
- Combined filters
- Empty collection edge case
- Commander with no matching cards

---

### Worker 3: UI Components

**Branch:** `feature/ui-components`

**Deliverables:**

- All components in `src/app/features/`
- `src/app/app.component.ts`
- `src/styles.css` (Tailwind config + custom properties)

**Requirements:**

- Standalone components only
- OnPush change detection
- Native control flow (@if, @for)
- Signal inputs where applicable
- Responsive design (mobile-first)
- Accessible (ARIA labels, keyboard nav)

**Component Specifications:**

**CollectionInputComponent**

- Tab toggle between paste/upload/url
- Textarea with placeholder showing format examples
- File input styled as drop zone
- Archidekt URL input with fetch button
- Stats bar showing parsed card count
- Loading state for URL fetching

**ArchidektUrlComponent**

- Text input for URL
- "Import" button
- Loading spinner while fetching
- Error messages for invalid URL, private deck, etc.
- Success message showing deck name and card count
- Helper text: "Tip: Create a public deck with your collection cards"

**FiltersComponent**

- Color buttons (W/U/B/R/G) with toggle state
- Min percent dropdown
- Sort dropdown
- Horizontal layout, wraps on mobile

**CommanderCardComponent**

- Card with hover state
- Progress bar with color coding (green >70%, yellow 40-70%, red <40%)
- Expandable on click
- Owned/missing card tags when expanded
- EDHREC link

---

## Implementation Order

1. **Phase 1: Foundation**

   - Create Angular project with CLI
   - Configure Tailwind
   - Set up types and models
   - Add commanders.json to assets

2. **Phase 2: Services (parallel)**

   - Worker 1: CollectionService
   - Worker 2: CommanderService + DeckMatcherService

3. **Phase 3: UI (after services)**

   - Worker 3: All components
   - Integration with services

4. **Phase 4: Polish**
   - Accessibility audit
   - Performance optimization
   - Final testing
   - Deployment setup

---

## Out of Scope (v1)

- User accounts / cloud sync
- Price tracking for missing cards
- Multiple collection support
- Theme/budget variants of decks
- Direct EDHREC API integration (we use cached JSON)
- Card images
- Deck export functionality
