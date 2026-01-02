import { Injectable, signal, computed, type Signal, type WritableSignal } from '@angular/core';

const STORAGE_KEY = 'mtg-collection';

/**
 * Normalizes a card name for consistent matching.
 * - Converts to lowercase
 * - Removes all non-alphanumeric characters
 * - Trims whitespace
 * - Handles split cards (Fire // Ice -> fireice)
 */
export function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly _collection: WritableSignal<Map<string, number>> = signal(
    this.loadFromStorage()
  );

  /** Reactive collection state */
  readonly collection: Signal<Map<string, number>> = this._collection.asReadonly();

  /** Computed count of unique cards in the collection */
  readonly uniqueCardCount: Signal<number> = computed(() => this._collection().size);

  /**
   * Parses collection text input and updates the collection state.
   * Supports multiple formats:
   * - Plain list: "Lightning Bolt\nCounterspell"
   * - Quantities: "4 Lightning Bolt", "4x Lightning Bolt", "4X Lightning Bolt"
   * - CSV: "4,Lightning Bolt,2XM" (quantity, name, set - set is ignored)
   * - Skips empty lines and comments (# or //)
   */
  parseCollection(text: string): Map<string, number> {
    const collection = new Map<string, number>();
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
        continue;
      }

      const parsed = this.parseLine(trimmedLine);
      if (parsed) {
        const { name, quantity } = parsed;
        const normalizedName = normalizeCardName(name);
        if (normalizedName) {
          const currentQty = collection.get(normalizedName) ?? 0;
          collection.set(normalizedName, currentQty + quantity);
        }
      }
    }

    this._collection.set(collection);
    this.saveToStorage(collection);

    return collection;
  }

  /**
   * Parses a single line and extracts card name and quantity.
   */
  private parseLine(line: string): { name: string; quantity: number } | null {
    // Skip header rows commonly found in CSV exports
    const lowerLine = line.toLowerCase();
    if (lowerLine.startsWith('count,') || lowerLine.startsWith('quantity,') ||
        lowerLine.startsWith('name,') || lowerLine.startsWith('card,') ||
        lowerLine.startsWith('"count"') || lowerLine.startsWith('"name"')) {
      return null;
    }

    // Try CSV format: handles both "4,Lightning Bolt,2XM" and "Lightning Bolt,4,2XM"
    if (line.includes(',')) {
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, '')); // Remove quotes
      if (parts.length >= 2) {
        const firstNum = parseInt(parts[0], 10);
        const secondNum = parseInt(parts[1], 10);

        // Format: "4,Lightning Bolt,..." (quantity first)
        if (!isNaN(firstNum) && firstNum > 0 && isNaN(secondNum)) {
          return { name: parts[1], quantity: firstNum };
        }

        // Format: "Lightning Bolt,4,..." (name first, quantity second)
        if (isNaN(firstNum) && !isNaN(secondNum) && secondNum > 0) {
          return { name: parts[0], quantity: secondNum };
        }

        // Format: "Lightning Bolt,set,..." (name first, no quantity) - default to 1
        if (isNaN(firstNum) && parts[0].length > 0) {
          // Check if any column looks like a quantity
          for (let i = 1; i < parts.length; i++) {
            const num = parseInt(parts[i], 10);
            if (!isNaN(num) && num > 0 && num < 1000) {
              return { name: parts[0], quantity: num };
            }
          }
          return { name: parts[0], quantity: 1 };
        }
      }
    }

    // Try quantity formats: "4 Lightning Bolt", "4x Lightning Bolt", "4X Lightning Bolt"
    const quantityMatch = line.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    if (quantityMatch) {
      const quantity = parseInt(quantityMatch[1], 10);
      const name = quantityMatch[2].trim();
      if (quantity > 0 && name) {
        return { name, quantity };
      }
    }

    // Plain card name (no quantity specified, default to 1)
    return { name: line, quantity: 1 };
  }

  /**
   * Clears the collection.
   */
  clearCollection(): void {
    this._collection.set(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Loads collection from localStorage.
   */
  private loadFromStorage(): Map<string, number> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as [string, number][];
        return new Map(parsed);
      }
    } catch {
      // If parsing fails, return empty collection
    }
    return new Map();
  }

  /**
   * Saves collection to localStorage.
   */
  private saveToStorage(collection: Map<string, number>): void {
    try {
      const serialized = JSON.stringify([...collection.entries()]);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Silently fail if localStorage is not available
    }
  }
}
