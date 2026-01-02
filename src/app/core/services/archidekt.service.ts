import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ArchidektDeckResponse, CachedArchidektDeck } from '../models/types';

const CACHE_KEY_PREFIX = 'archidekt-cache-';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const ARCHIDEKT_API_URL = 'https://archidekt.com/api/decks';

/** URL patterns for Archidekt deck URLs */
const ARCHIDEKT_URL_PATTERN = /^https?:\/\/(?:www\.)?archidekt\.com\/decks\/(\d+)(?:\/[\w-]*)?$/;

@Injectable({ providedIn: 'root' })
export class ArchidektService {
  private readonly http = inject(HttpClient);

  /**
   * Extracts the deck ID from an Archidekt URL.
   * Supports URLs like:
   * - https://archidekt.com/decks/123456
   * - https://archidekt.com/decks/123456/my-deck-name
   * - http://www.archidekt.com/decks/123456
   *
   * @returns The deck ID string or null if the URL is invalid
   */
  extractDeckId(url: string): string | null {
    const match = url.trim().match(ARCHIDEKT_URL_PATTERN);
    return match ? match[1] : null;
  }

  /**
   * Validates if a string is a valid Archidekt deck URL.
   */
  isValidArchidektUrl(url: string): boolean {
    return ARCHIDEKT_URL_PATTERN.test(url.trim());
  }

  /**
   * Fetches a deck from Archidekt by deck ID.
   * Uses cached data if available and not expired.
   *
   * @returns Array of cards with name and quantity
   */
  async fetchDeck(deckId: string): Promise<{ name: string; quantity: number }[]> {
    // Check cache first
    const cached = this.getFromCache(deckId);
    if (cached) {
      return [...cached.cards];
    }

    // Fetch from API
    const response = await firstValueFrom(
      this.http.get<ArchidektDeckResponse>(`${ARCHIDEKT_API_URL}/${deckId}/`)
    );

    const cards = response.cards.map((entry) => ({
      name: entry.card.oracleCard.name,
      quantity: entry.quantity,
    }));

    // Cache the result
    this.saveToCache(deckId, cards);

    return cards;
  }

  /**
   * Gets cached deck data if available and not expired.
   */
  private getFromCache(deckId: string): CachedArchidektDeck | null {
    try {
      const key = `${CACHE_KEY_PREFIX}${deckId}`;
      const stored = localStorage.getItem(key);

      if (!stored) {
        return null;
      }

      const cached = JSON.parse(stored) as CachedArchidektDeck;
      const fetchedAt = new Date(cached.fetchedAt).getTime();
      const now = Date.now();

      // Check if cache has expired
      if (now - fetchedAt > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  }

  /**
   * Saves deck data to cache.
   */
  private saveToCache(deckId: string, cards: { name: string; quantity: number }[]): void {
    try {
      const cached: CachedArchidektDeck = {
        fetchedAt: new Date().toISOString(),
        deckId,
        cards,
      };

      const key = `${CACHE_KEY_PREFIX}${deckId}`;
      localStorage.setItem(key, JSON.stringify(cached));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Clears the cache for a specific deck.
   */
  clearCache(deckId: string): void {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${deckId}`);
  }

  /**
   * Clears all Archidekt caches.
   */
  clearAllCaches(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}
