/** MTG Color Identity - always use WUBRG order */
export type ColorIdentity = 'W' | 'U' | 'B' | 'R' | 'G';

/** Card with quantity for deck lists */
export interface DeckCard {
  readonly name: string;
  readonly quantity: number;
}

/** Card match info showing owned vs required quantities */
export interface CardMatchInfo {
  readonly name: string;
  readonly required: number;
  readonly owned: number;
}

/** Commander data from EDHREC */
export interface Commander {
  readonly name: string;
  readonly slug: string;
  readonly colorIdentity: readonly ColorIdentity[];
  readonly numDecks: number;
  readonly cards: readonly DeckCard[];
}

/** Result of matching a collection against a commander's decklist */
export interface MatchResult {
  readonly percent: number;
  readonly owned: number;
  readonly total: number;
  readonly missing: number;
  readonly ownedCards: readonly CardMatchInfo[];
  readonly missingCards: readonly CardMatchInfo[];
  readonly hasCommander: boolean;
}

/** Commander with match results for display */
export interface MatchedCommander {
  readonly commander: Commander;
  readonly match: MatchResult;
}

/** Available sort options */
export type SortOption = 'percent' | 'owned' | 'missing' | 'popularity';

/** Filter state for results */
export interface Filters {
  readonly colors: readonly ColorIdentity[];
  readonly minPercent: number;
  readonly sortBy: SortOption;
  readonly requireCommander: boolean;
}

/** Response shape from Archidekt API */
export interface ArchidektDeckResponse {
  readonly id: number;
  readonly name: string;
  readonly cards: readonly ArchidektCardEntry[];
}

export interface ArchidektCardEntry {
  readonly quantity: number;
  readonly card: {
    readonly oracleCard: {
      readonly name: string;
    };
  };
}

/** Cached Archidekt deck with timestamp */
export interface CachedArchidektDeck {
  readonly fetchedAt: string;
  readonly deckId: string;
  readonly cards: readonly { name: string; quantity: number }[];
}

/** Commander data file metadata */
export interface CommanderData {
  readonly updatedAt: string;
  readonly commanders: readonly Commander[];
}
