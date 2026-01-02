import { TestBed } from '@angular/core/testing';
import { DeckMatcherService } from './deck-matcher.service';
import { Commander, DeckCard, Filters } from '../models/types';

describe('DeckMatcherService', () => {
  let service: DeckMatcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckMatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /** Helper to create deck cards with quantity */
  const card = (name: string, quantity = 1): DeckCard => ({ name, quantity });

  describe('calculateMatch', () => {
    it('should calculate 100% match when all cards are owned', () => {
      const deckCards: DeckCard[] = [
        card('Sol Ring'),
        card('Arcane Signet'),
        card('Command Tower'),
      ];
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 2],
        ['commandtower', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(100);
      expect(result.owned).toBe(3);
      expect(result.total).toBe(3);
      expect(result.missing).toBe(0);
      expect(result.ownedCards.map(c => c.name)).toEqual([
        'Sol Ring',
        'Arcane Signet',
        'Command Tower',
      ]);
      expect(result.missingCards).toEqual([]);
    });

    it('should calculate 50% match correctly', () => {
      const deckCards: DeckCard[] = [
        card('Sol Ring'),
        card('Arcane Signet'),
        card('Command Tower'),
        card('Mana Crypt'),
      ];
      const collection = new Map<string, number>([
        ['solring', 1],
        ['commandtower', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(50);
      expect(result.owned).toBe(2);
      expect(result.total).toBe(4);
      expect(result.missing).toBe(2);
      expect(result.ownedCards.map(c => c.name)).toEqual(['Sol Ring', 'Command Tower']);
      expect(result.missingCards.map(c => c.name)).toEqual(['Arcane Signet', 'Mana Crypt']);
    });

    it('should calculate 0% match when no cards are owned', () => {
      const deckCards: DeckCard[] = [
        card('Sol Ring'),
        card('Arcane Signet'),
        card('Command Tower'),
      ];
      const collection = new Map<string, number>();

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(0);
      expect(result.owned).toBe(0);
      expect(result.total).toBe(3);
      expect(result.missing).toBe(3);
      expect(result.ownedCards).toEqual([]);
      expect(result.missingCards.map(c => c.name)).toEqual([
        'Sol Ring',
        'Arcane Signet',
        'Command Tower',
      ]);
    });

    it('should handle empty collection', () => {
      const deckCards: DeckCard[] = [card('Sol Ring'), card('Mana Crypt')];
      const collection = new Map<string, number>();

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(0);
      expect(result.owned).toBe(0);
      expect(result.missing).toBe(2);
    });

    it('should handle empty deck cards', () => {
      const deckCards: DeckCard[] = [];
      const collection = new Map<string, number>([['solring', 1]]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(0);
      expect(result.owned).toBe(0);
      expect(result.total).toBe(0);
      expect(result.missing).toBe(0);
    });

    it('should handle split cards correctly', () => {
      const deckCards: DeckCard[] = [card('Fire // Ice'), card('Wear // Tear')];
      const collection = new Map<string, number>([
        ['fireice', 1],
        ['weartear', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(100);
      expect(result.owned).toBe(2);
      expect(result.ownedCards.map(c => c.name)).toEqual(['Fire // Ice', 'Wear // Tear']);
    });

    it('should normalize card names with special characters', () => {
      const deckCards: DeckCard[] = [
        card("Frodo, Sauron's Bane"),
        card('Ral, Storm Conduit'),
      ];
      const collection = new Map<string, number>([
        ['frodosauronsbane', 1],
        ['ralstormconduit', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(100);
      expect(result.owned).toBe(2);
    });

    it('should be case insensitive', () => {
      const deckCards: DeckCard[] = [card('SOL RING'), card('Arcane Signet')];
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(100);
    });

    it('should round percentage correctly', () => {
      const deckCards: DeckCard[] = [card('Card 1'), card('Card 2'), card('Card 3')];
      const collection = new Map<string, number>([['card1', 1]]);

      const result = service.calculateMatch(deckCards, collection);

      // 1/3 = 33.33... should round to 33
      expect(result.percent).toBe(33);
    });

    it('should handle quantities - partial match for basic lands', () => {
      const deckCards: DeckCard[] = [
        card('Island', 10),
        card('Sol Ring'),
      ];
      const collection = new Map<string, number>([
        ['island', 5],
        ['solring', 1],
      ]);

      const result = service.calculateMatch(deckCards, collection);

      // 5 Islands + 1 Sol Ring = 6 owned out of 11 total = 55%
      expect(result.percent).toBe(55);
      expect(result.owned).toBe(6);
      expect(result.total).toBe(11);
      expect(result.missing).toBe(5);
    });

    it('should show partial cards in both owned and missing lists', () => {
      const deckCards: DeckCard[] = [card('Island', 10)];
      const collection = new Map<string, number>([['island', 5]]);

      const result = service.calculateMatch(deckCards, collection);

      // Island is partial: 5 owned, 5 missing
      expect(result.ownedCards.length).toBe(1);
      expect(result.missingCards.length).toBe(1);
      expect(result.ownedCards[0]).toEqual({ name: 'Island', required: 10, owned: 5 });
      expect(result.missingCards[0]).toEqual({ name: 'Island', required: 10, owned: 5 });
    });

    it('should count fully owned multi-quantity cards correctly', () => {
      const deckCards: DeckCard[] = [card('Island', 10)];
      const collection = new Map<string, number>([['island', 15]]);

      const result = service.calculateMatch(deckCards, collection);

      expect(result.percent).toBe(100);
      expect(result.owned).toBe(10);
      expect(result.missing).toBe(0);
      expect(result.ownedCards[0]).toEqual({ name: 'Island', required: 10, owned: 10 });
    });
  });

  describe('getFilteredResults', () => {
    const createCommander = (
      name: string,
      colors: readonly ('W' | 'U' | 'B' | 'R' | 'G')[],
      numDecks: number,
      cardNames: readonly string[]
    ): Commander => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      colorIdentity: colors,
      numDecks,
      cards: cardNames.map(n => ({ name: n, quantity: 1 })),
    });

    const commanders: Commander[] = [
      createCommander('Atraxa', ['W', 'U', 'B', 'G'], 15000, [
        'Sol Ring',
        'Arcane Signet',
        'Command Tower',
        'Deepglow Skate',
      ]),
      createCommander('Edgar', ['W', 'B', 'R'], 12000, [
        'Sol Ring',
        'Blood Artist',
      ]),
      createCommander('Urza', ['U'], 10000, ['Sol Ring', 'Mana Crypt']),
      createCommander('Omnath', ['R', 'G'], 8000, [
        'Sol Ring',
        'Lotus Cobra',
        'Kodama',
      ]),
      createCommander('Teysa', ['W', 'B'], 5000, [
        'Sol Ring',
        'Arcane Signet',
      ]),
    ];

    const defaultFilters: Filters = {
      colors: [],
      minPercent: 0,
      sortBy: 'percent',
      requireCommander: false,
    };

    it('should filter by single color', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      const filters: Filters = { ...defaultFilters, colors: ['U'] };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Should include Atraxa (WUBG), Urza (U)
      expect(results.length).toBe(2);
      expect(results.map((r) => r.commander.name)).toContain('Atraxa');
      expect(results.map((r) => r.commander.name)).toContain('Urza');
    });

    it('should filter by multiple colors with AND logic', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      const filters: Filters = { ...defaultFilters, colors: ['W', 'B'] };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Should include: Atraxa (WUBG), Edgar (WBR), Teysa (WB)
      expect(results.length).toBe(3);
      const names = results.map((r) => r.commander.name);
      expect(names).toContain('Atraxa');
      expect(names).toContain('Edgar');
      expect(names).toContain('Teysa');
      expect(names).not.toContain('Urza');
      expect(names).not.toContain('Omnath');
    });

    it('should filter by minPercent', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);
      const filters: Filters = { ...defaultFilters, minPercent: 50 };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Edgar: 1/2 = 50%, Urza: 1/2 = 50%, Teysa: 2/2 = 100%
      // Atraxa: 2/4 = 50%, Omnath: 1/3 = 33%
      expect(results.every((r) => r.match.percent >= 50)).toBe(true);
      expect(results.map((r) => r.commander.name)).not.toContain('Omnath');
    });

    it('should sort by percent descending', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);
      const filters: Filters = { ...defaultFilters, sortBy: 'percent' };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Verify descending order by percent
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].match.percent).toBeGreaterThanOrEqual(
          results[i + 1].match.percent
        );
      }
    });

    it('should sort by owned descending', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
        ['commandtower', 1],
      ]);
      const filters: Filters = { ...defaultFilters, sortBy: 'owned' };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Verify descending order by owned count
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].match.owned).toBeGreaterThanOrEqual(
          results[i + 1].match.owned
        );
      }
    });

    it('should sort by missing ascending', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);
      const filters: Filters = { ...defaultFilters, sortBy: 'missing' };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Verify ascending order by missing count (fewer missing = better)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].match.missing).toBeLessThanOrEqual(
          results[i + 1].match.missing
        );
      }
    });

    it('should sort by popularity (numDecks descending)', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      const filters: Filters = { ...defaultFilters, sortBy: 'popularity' };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Verify descending order by numDecks
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].commander.numDecks).toBeGreaterThanOrEqual(
          results[i + 1].commander.numDecks
        );
      }
    });

    it('should apply combined filters correctly', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);
      const filters: Filters = {
        colors: ['W'],
        minPercent: 50,
        sortBy: 'percent',
        requireCommander: false,
      };

      const results = service.getFilteredResults(commanders, collection, filters);

      // All results should have W in color identity
      expect(
        results.every((r) => r.commander.colorIdentity.includes('W'))
      ).toBe(true);

      // All results should have >= 50% match
      expect(results.every((r) => r.match.percent >= 50)).toBe(true);

      // Results should be sorted by percent descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].match.percent).toBeGreaterThanOrEqual(
          results[i + 1].match.percent
        );
      }
    });

    it('should return empty array when no commanders match filters', () => {
      const collection = new Map<string, number>();
      const filters: Filters = { colors: [], minPercent: 100, sortBy: 'percent', requireCommander: false };

      const results = service.getFilteredResults(commanders, collection, filters);

      expect(results.length).toBe(0);
    });

    it('should return all commanders when no filters applied', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      const filters: Filters = { colors: [], minPercent: 0, sortBy: 'percent', requireCommander: false };

      const results = service.getFilteredResults(commanders, collection, filters);

      expect(results.length).toBe(commanders.length);
    });

    it('should include match details in results', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['arcanesignet', 1],
      ]);
      const filters: Filters = defaultFilters;

      const results = service.getFilteredResults(commanders, collection, filters);

      const teysaResult = results.find((r) => r.commander.name === 'Teysa');
      expect(teysaResult).toBeDefined();
      expect(teysaResult!.match.percent).toBe(100);
      expect(teysaResult!.match.owned).toBe(2);
      expect(teysaResult!.match.total).toBe(2);
      expect(teysaResult!.match.missing).toBe(0);
      expect(teysaResult!.match.ownedCards.map(c => c.name)).toEqual([
        'Sol Ring',
        'Arcane Signet',
      ]);
      expect(teysaResult!.match.missingCards).toEqual([]);
    });

    it('should show all commanders when all 5 colors are selected', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      // All 5 colors selected = show all (same as no filter)
      const filters: Filters = { colors: ['W', 'U', 'B', 'R', 'G'], minPercent: 0, sortBy: 'percent', requireCommander: false };

      const results = service.getFilteredResults(commanders, collection, filters);

      // All 5 colors selected means "show all"
      expect(results.length).toBe(commanders.length);
    });

    it('should filter when only some colors are selected', () => {
      const collection = new Map<string, number>([['solring', 1]]);
      // Only WUBG - should only match Atraxa
      const filters: Filters = { colors: ['W', 'U', 'B', 'G'], minPercent: 0, sortBy: 'percent', requireCommander: false };

      const results = service.getFilteredResults(commanders, collection, filters);

      expect(results.length).toBe(1);
      expect(results[0].commander.name).toBe('Atraxa');
    });

    it('should filter by requireCommander when true', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['atraxa', 1], // Own Atraxa
        ['teysa', 1],  // Own Teysa
      ]);
      const filters: Filters = { ...defaultFilters, requireCommander: true };

      const results = service.getFilteredResults(commanders, collection, filters);

      // Should only include Atraxa and Teysa (commanders we own)
      expect(results.length).toBe(2);
      const names = results.map(r => r.commander.name);
      expect(names).toContain('Atraxa');
      expect(names).toContain('Teysa');
      expect(names).not.toContain('Edgar');
      expect(names).not.toContain('Urza');
      expect(names).not.toContain('Omnath');
    });

    it('should include hasCommander in match result', () => {
      const collection = new Map<string, number>([
        ['solring', 1],
        ['atraxa', 1],
      ]);
      const filters: Filters = { ...defaultFilters, requireCommander: false };

      const results = service.getFilteredResults(commanders, collection, filters);

      const atraxaResult = results.find(r => r.commander.name === 'Atraxa');
      const edzarResult = results.find(r => r.commander.name === 'Edgar');

      expect(atraxaResult!.match.hasCommander).toBe(true);
      expect(edzarResult!.match.hasCommander).toBe(false);
    });
  });
});
