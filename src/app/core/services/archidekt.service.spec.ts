import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ArchidektService } from './archidekt.service';
import type { ArchidektDeckResponse, CachedArchidektDeck } from '../models/types';

describe('ArchidektService', () => {
  let service: ArchidektService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ArchidektService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('extractDeckId', () => {
    it('should extract deck ID from valid URL', () => {
      const url = 'https://archidekt.com/decks/123456';
      expect(service.extractDeckId(url)).toBe('123456');
    });

    it('should extract deck ID from URL with slug', () => {
      const url = 'https://archidekt.com/decks/123456/my-awesome-deck';
      expect(service.extractDeckId(url)).toBe('123456');
    });

    it('should extract deck ID from URL with www', () => {
      const url = 'https://www.archidekt.com/decks/789012';
      expect(service.extractDeckId(url)).toBe('789012');
    });

    it('should extract deck ID from http URL', () => {
      const url = 'http://archidekt.com/decks/456789';
      expect(service.extractDeckId(url)).toBe('456789');
    });

    it('should return null for invalid URL', () => {
      expect(service.extractDeckId('https://moxfield.com/decks/123')).toBeNull();
      expect(service.extractDeckId('not a url')).toBeNull();
      expect(service.extractDeckId('')).toBeNull();
    });

    it('should return null for URL without deck ID', () => {
      expect(service.extractDeckId('https://archidekt.com/decks/')).toBeNull();
      expect(service.extractDeckId('https://archidekt.com/')).toBeNull();
    });

    it('should handle URLs with trailing whitespace', () => {
      const url = '  https://archidekt.com/decks/123456  ';
      expect(service.extractDeckId(url)).toBe('123456');
    });
  });

  describe('isValidArchidektUrl', () => {
    it('should return true for valid Archidekt URL', () => {
      expect(service.isValidArchidektUrl('https://archidekt.com/decks/123456')).toBe(true);
    });

    it('should return true for URL with slug', () => {
      expect(service.isValidArchidektUrl('https://archidekt.com/decks/123456/my-deck')).toBe(true);
    });

    it('should return true for URL with www', () => {
      expect(service.isValidArchidektUrl('https://www.archidekt.com/decks/123456')).toBe(true);
    });

    it('should return false for non-Archidekt URL', () => {
      expect(service.isValidArchidektUrl('https://moxfield.com/decks/abc123')).toBe(false);
    });

    it('should return false for malformed URL', () => {
      expect(service.isValidArchidektUrl('archidekt.com/decks/123')).toBe(false);
      expect(service.isValidArchidektUrl('https://archidekt.com/123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isValidArchidektUrl('')).toBe(false);
    });
  });

  describe('fetchDeck', () => {
    const mockResponse: ArchidektDeckResponse = {
      id: 123456,
      name: 'Test Deck',
      cards: [
        {
          quantity: 4,
          card: {
            oracleCard: {
              name: 'Lightning Bolt',
            },
          },
        },
        {
          quantity: 2,
          card: {
            oracleCard: {
              name: 'Counterspell',
            },
          },
        },
      ],
    };

    it('should fetch deck from API', async () => {
      const fetchPromise = service.fetchDeck('123456');

      const req = httpMock.expectOne('https://archidekt.com/api/decks/123456/');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);

      const result = await fetchPromise;

      expect(result).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 2 },
      ]);
    });

    it('should cache fetched deck', async () => {
      const fetchPromise = service.fetchDeck('123456');

      const req = httpMock.expectOne('https://archidekt.com/api/decks/123456/');
      req.flush(mockResponse);

      await fetchPromise;

      const cached = localStorage.getItem('archidekt-cache-123456');
      expect(cached).not.toBeNull();

      const parsedCache = JSON.parse(cached!) as CachedArchidektDeck;
      expect(parsedCache.deckId).toBe('123456');
      expect(parsedCache.cards).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 2 },
      ]);
    });

    it('should return cached data if available and not expired', async () => {
      // Pre-populate cache
      const cachedData: CachedArchidektDeck = {
        fetchedAt: new Date().toISOString(),
        deckId: '123456',
        cards: [{ name: 'Cached Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      const result = await service.fetchDeck('123456');

      // No HTTP request should be made
      httpMock.expectNone('https://archidekt.com/api/decks/123456/');

      expect(result).toEqual([{ name: 'Cached Card', quantity: 1 }]);
    });

    it('should fetch from API if cache is expired', async () => {
      // Pre-populate cache with expired data (25 hours ago)
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const cachedData: CachedArchidektDeck = {
        fetchedAt: expiredDate.toISOString(),
        deckId: '123456',
        cards: [{ name: 'Expired Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      const fetchPromise = service.fetchDeck('123456');

      // Should make HTTP request since cache is expired
      const req = httpMock.expectOne('https://archidekt.com/api/decks/123456/');
      req.flush(mockResponse);

      const result = await fetchPromise;

      expect(result).toEqual([
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Counterspell', quantity: 2 },
      ]);
    });

    it('should handle API errors', async () => {
      const fetchPromise = service.fetchDeck('999999');

      const req = httpMock.expectOne('https://archidekt.com/api/decks/999999/');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(fetchPromise).rejects.toBeTruthy();
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific deck', () => {
      const cachedData: CachedArchidektDeck = {
        fetchedAt: new Date().toISOString(),
        deckId: '123456',
        cards: [{ name: 'Test Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      service.clearCache('123456');

      expect(localStorage.getItem('archidekt-cache-123456')).toBeNull();
    });

    it('should clear all Archidekt caches', () => {
      // Set up multiple cache entries
      localStorage.setItem(
        'archidekt-cache-111',
        JSON.stringify({
          fetchedAt: new Date().toISOString(),
          deckId: '111',
          cards: [],
        })
      );
      localStorage.setItem(
        'archidekt-cache-222',
        JSON.stringify({
          fetchedAt: new Date().toISOString(),
          deckId: '222',
          cards: [],
        })
      );
      localStorage.setItem('other-key', 'should not be removed');

      service.clearAllCaches();

      expect(localStorage.getItem('archidekt-cache-111')).toBeNull();
      expect(localStorage.getItem('archidekt-cache-222')).toBeNull();
      expect(localStorage.getItem('other-key')).toBe('should not be removed');
    });
  });

  describe('cache expiration', () => {
    it('should consider cache valid within 24 hours', async () => {
      // Cache from 23 hours ago
      const recentDate = new Date(Date.now() - 23 * 60 * 60 * 1000);
      const cachedData: CachedArchidektDeck = {
        fetchedAt: recentDate.toISOString(),
        deckId: '123456',
        cards: [{ name: 'Recent Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      const result = await service.fetchDeck('123456');

      // No HTTP request should be made - cache is still valid
      httpMock.expectNone('https://archidekt.com/api/decks/123456/');

      expect(result).toEqual([{ name: 'Recent Card', quantity: 1 }]);
    });

    it('should consider cache expired after exactly 24 hours', async () => {
      // Cache from exactly 24 hours + 1 second ago
      const expiredDate = new Date(Date.now() - (24 * 60 * 60 * 1000 + 1000));
      const cachedData: CachedArchidektDeck = {
        fetchedAt: expiredDate.toISOString(),
        deckId: '123456',
        cards: [{ name: 'Expired Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      const mockResponse: ArchidektDeckResponse = {
        id: 123456,
        name: 'Test Deck',
        cards: [
          {
            quantity: 1,
            card: {
              oracleCard: {
                name: 'Fresh Card',
              },
            },
          },
        ],
      };

      const fetchPromise = service.fetchDeck('123456');

      // Should make HTTP request since cache is expired
      const req = httpMock.expectOne('https://archidekt.com/api/decks/123456/');
      req.flush(mockResponse);

      const result = await fetchPromise;

      expect(result).toEqual([{ name: 'Fresh Card', quantity: 1 }]);
    });

    it('should remove expired cache entry from localStorage', async () => {
      // Cache from 25 hours ago
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const cachedData: CachedArchidektDeck = {
        fetchedAt: expiredDate.toISOString(),
        deckId: '123456',
        cards: [{ name: 'Expired Card', quantity: 1 }],
      };
      localStorage.setItem('archidekt-cache-123456', JSON.stringify(cachedData));

      const mockResponse: ArchidektDeckResponse = {
        id: 123456,
        name: 'Test Deck',
        cards: [],
      };

      const fetchPromise = service.fetchDeck('123456');

      const req = httpMock.expectOne('https://archidekt.com/api/decks/123456/');
      req.flush(mockResponse);

      await fetchPromise;

      // New cache should be stored with current timestamp
      const newCached = JSON.parse(
        localStorage.getItem('archidekt-cache-123456')!
      ) as CachedArchidektDeck;
      const newFetchedAt = new Date(newCached.fetchedAt).getTime();
      const now = Date.now();

      // Should be very recent (within last second)
      expect(now - newFetchedAt).toBeLessThan(1000);
    });
  });
});
