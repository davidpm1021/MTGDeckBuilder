import { Injectable } from '@angular/core';
import {
  Commander,
  ColorIdentity,
  DeckCard,
  CardMatchInfo,
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
   * Now supports quantities - if a deck needs 10 Islands and you have 5,
   * it counts as 5 owned and 5 missing.
   *
   * @param deckCards - Cards required for the commander deck with quantities
   * @param collection - User's collection as a map of normalized name to quantity
   * @param commanderName - The commander's name to check ownership
   * @returns Match result with percentage, counts, and card lists
   */
  calculateMatch(
    deckCards: readonly DeckCard[],
    collection: Map<string, number>,
    commanderName: string = ''
  ): MatchResult {
    // Total card slots needed (sum of all quantities)
    const total = deckCards.reduce((sum, card) => sum + card.quantity, 0);

    if (total === 0) {
      return {
        percent: 0,
        owned: 0,
        total: 0,
        missing: 0,
        ownedCards: [],
        missingCards: [],
        hasCommander: false,
      };
    }

    // Check if user owns the commander
    const normalizedCommanderName = normalizeCardName(commanderName);
    const hasCommander = normalizedCommanderName
      ? (collection.get(normalizedCommanderName) ?? 0) > 0
      : false;

    const ownedCards: CardMatchInfo[] = [];
    const missingCards: CardMatchInfo[] = [];
    let ownedCount = 0;
    let missingCount = 0;

    for (const deckCard of deckCards) {
      const normalizedName = normalizeCardName(deckCard.name);
      const collectionQty = collection.get(normalizedName) ?? 0;
      const requiredQty = deckCard.quantity;

      // How many of this card do we actually have for the deck?
      const ownedQty = Math.min(collectionQty, requiredQty);
      const missingQty = requiredQty - ownedQty;

      ownedCount += ownedQty;
      missingCount += missingQty;

      const cardInfo: CardMatchInfo = {
        name: deckCard.name,
        required: requiredQty,
        owned: ownedQty,
      };

      if (ownedQty >= requiredQty) {
        // Fully owned
        ownedCards.push(cardInfo);
      } else if (ownedQty > 0) {
        // Partially owned - show in both lists
        ownedCards.push(cardInfo);
        missingCards.push(cardInfo);
      } else {
        // Completely missing
        missingCards.push(cardInfo);
      }
    }

    const percent = Math.round((ownedCount / total) * 100);

    return {
      percent,
      owned: ownedCount,
      total,
      missing: missingCount,
      ownedCards,
      missingCards,
      hasCommander,
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

      const match = this.calculateMatch(commander.cards, collection, commander.name);

      // Apply requireCommander filter
      if (filters.requireCommander && !match.hasCommander) {
        continue;
      }

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
