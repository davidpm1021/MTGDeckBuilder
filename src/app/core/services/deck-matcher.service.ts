import { Injectable } from '@angular/core';
import {
  Commander,
  ColorIdentity,
  Filters,
  MatchResult,
  MatchedCommander,
} from '../models/types';

/**
 * Normalizes a card name for comparison.
 * - Converts to lowercase
 * - Removes all non-alphanumeric characters
 * - Handles split cards: "Fire // Ice" -> "fireice"
 */
function normalizeCardName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Service for matching user collections against commander decklists.
 * Provides pure functions for calculating matches and filtering results.
 */
@Injectable({ providedIn: 'root' })
export class DeckMatcherService {
  /**
   * Calculates how well a user's collection matches a commander's decklist.
   *
   * @param deckCards - Cards required for the commander deck
   * @param collection - User's collection as a map of normalized name to quantity
   * @returns Match result with percentage, counts, and card lists
   */
  calculateMatch(
    deckCards: readonly string[],
    collection: Map<string, number>
  ): MatchResult {
    const total = deckCards.length;

    if (total === 0) {
      return {
        percent: 0,
        owned: 0,
        total: 0,
        missing: 0,
        ownedCards: [],
        missingCards: [],
      };
    }

    const ownedCards: string[] = [];
    const missingCards: string[] = [];

    for (const card of deckCards) {
      const normalizedName = normalizeCardName(card);
      const quantity = collection.get(normalizedName) ?? 0;

      if (quantity > 0) {
        ownedCards.push(card);
      } else {
        missingCards.push(card);
      }
    }

    const owned = ownedCards.length;
    const missing = missingCards.length;
    const percent = Math.round((owned / total) * 100);

    return {
      percent,
      owned,
      total,
      missing,
      ownedCards,
      missingCards,
    };
  }

  /**
   * Filters and sorts commanders based on collection match and filter criteria.
   *
   * @param commanders - All commanders to filter
   * @param collection - User's collection as a map of normalized name to quantity
   * @param filters - Filter and sort criteria
   * @returns Filtered and sorted list of matched commanders
   */
  getFilteredResults(
    commanders: Commander[],
    collection: Map<string, number>,
    filters: Filters
  ): MatchedCommander[] {
    const results: MatchedCommander[] = [];

    for (const commander of commanders) {
      // Apply color filter (commander must contain ALL selected colors)
      if (!this.matchesColorFilter(commander.colorIdentity, filters.colors)) {
        continue;
      }

      const match = this.calculateMatch(commander.cards, collection);

      // Apply minPercent filter
      if (match.percent < filters.minPercent) {
        continue;
      }

      results.push({ commander, match });
    }

    // Sort results
    return this.sortResults(results, filters.sortBy);
  }

  /**
   * Checks if a commander's color identity contains all selected colors.
   * If no colors are selected OR all 5 colors are selected, all commanders match.
   */
  private matchesColorFilter(
    commanderColors: readonly ColorIdentity[],
    filterColors: readonly ColorIdentity[]
  ): boolean {
    // No filter or all colors selected = show all
    if (filterColors.length === 0 || filterColors.length === 5) {
      return true;
    }

    // Commander must contain ALL selected colors
    for (const color of filterColors) {
      if (!commanderColors.includes(color)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sorts matched commanders by the specified criteria.
   */
  private sortResults(
    results: MatchedCommander[],
    sortBy: Filters['sortBy']
  ): MatchedCommander[] {
    const sorted = [...results];

    switch (sortBy) {
      case 'percent':
        // Descending by percent
        sorted.sort((a, b) => b.match.percent - a.match.percent);
        break;
      case 'owned':
        // Descending by owned count
        sorted.sort((a, b) => b.match.owned - a.match.owned);
        break;
      case 'missing':
        // Ascending by missing count (fewer missing = better)
        sorted.sort((a, b) => a.match.missing - b.match.missing);
        break;
      case 'popularity':
        // Descending by numDecks
        sorted.sort((a, b) => b.commander.numDecks - a.commander.numDecks);
        break;
    }

    return sorted;
  }
}
