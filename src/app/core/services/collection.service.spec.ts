import { TestBed } from '@angular/core/testing';
import { CollectionService, normalizeCardName } from './collection.service';

describe('CollectionService', () => {
  let service: CollectionService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(CollectionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('normalizeCardName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeCardName('Lightning Bolt')).toBe('lightningbolt');
    });

    it('should remove non-alphanumeric characters', () => {
      expect(normalizeCardName("Jace, the Mind Sculptor")).toBe('jacethemindsculptor');
    });

    it('should handle split cards (Fire // Ice)', () => {
      expect(normalizeCardName('Fire // Ice')).toBe('fireice');
    });

    it('should trim whitespace', () => {
      expect(normalizeCardName('  Counterspell  ')).toBe('counterspell');
    });

    it('should handle apostrophes and special characters', () => {
      expect(normalizeCardName("Urza's Tower")).toBe('urzastower');
    });
  });

  describe('parseCollection', () => {
    it('should parse plain list', () => {
      const text = 'Lightning Bolt\nCounterspell';
      const result = service.parseCollection(text);

      expect(result.size).toBe(2);
      expect(result.get('lightningbolt')).toBe(1);
      expect(result.get('counterspell')).toBe(1);
    });

    it('should parse with quantities (4 Lightning Bolt)', () => {
      const text = '4 Lightning Bolt\n2 Counterspell';
      const result = service.parseCollection(text);

      expect(result.get('lightningbolt')).toBe(4);
      expect(result.get('counterspell')).toBe(2);
    });

    it('should parse with "x" format (4x Lightning Bolt)', () => {
      const text = '4x Lightning Bolt\n2x Counterspell';
      const result = service.parseCollection(text);

      expect(result.get('lightningbolt')).toBe(4);
      expect(result.get('counterspell')).toBe(2);
    });

    it('should parse with "X" format case insensitive (4X Lightning Bolt)', () => {
      const text = '4X Lightning Bolt\n2X Counterspell';
      const result = service.parseCollection(text);

      expect(result.get('lightningbolt')).toBe(4);
      expect(result.get('counterspell')).toBe(2);
    });

    it('should parse CSV format', () => {
      const text = '4,Lightning Bolt,2XM\n2,Counterspell,MM3';
      const result = service.parseCollection(text);

      expect(result.get('lightningbolt')).toBe(4);
      expect(result.get('counterspell')).toBe(2);
    });

    it('should handle empty lines', () => {
      const text = 'Lightning Bolt\n\n\nCounterspell';
      const result = service.parseCollection(text);

      expect(result.size).toBe(2);
    });

    it('should skip # comments', () => {
      const text = '# This is a comment\nLightning Bolt\n# Another comment\nCounterspell';
      const result = service.parseCollection(text);

      expect(result.size).toBe(2);
      expect(result.has('thisisacomment')).toBe(false);
    });

    it('should skip // comments', () => {
      const text = '// This is a comment\nLightning Bolt\n// Another comment\nCounterspell';
      const result = service.parseCollection(text);

      expect(result.size).toBe(2);
      expect(result.has('thisisacomment')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      const text = 'LIGHTNING BOLT\nlightning bolt';
      const result = service.parseCollection(text);

      // Both should be normalized to the same key and quantities combined
      expect(result.get('lightningbolt')).toBe(2);
    });

    it('should handle split cards (Fire // Ice)', () => {
      const text = 'Fire // Ice\n2x Wear // Tear';
      const result = service.parseCollection(text);

      expect(result.get('fireice')).toBe(1);
      expect(result.get('weartear')).toBe(2);
    });

    it('should combine quantities for duplicate cards', () => {
      const text = '2 Lightning Bolt\n3x Lightning Bolt';
      const result = service.parseCollection(text);

      expect(result.get('lightningbolt')).toBe(5);
    });

    it('should handle mixed formats in same input', () => {
      const text = `Lightning Bolt
4 Counterspell
2x Path to Exile
3,Swords to Plowshares,MH2
# This is a comment
Force of Will`;
      const result = service.parseCollection(text);

      expect(result.size).toBe(5);
      expect(result.get('lightningbolt')).toBe(1);
      expect(result.get('counterspell')).toBe(4);
      expect(result.get('pathtoexile')).toBe(2);
      expect(result.get('swordstoplowshares')).toBe(3);
      expect(result.get('forceofwill')).toBe(1);
    });
  });

  describe('localStorage persistence', () => {
    it('should save collection to localStorage', () => {
      service.parseCollection('4 Lightning Bolt');

      const stored = localStorage.getItem('mtg-collection');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as [string, number][];
      expect(parsed).toEqual([['lightningbolt', 4]]);
    });

    it('should load collection from localStorage on service creation', () => {
      // Reset TestBed to get a fresh service instance
      TestBed.resetTestingModule();

      // Manually set localStorage before creating service
      const data: [string, number][] = [
        ['lightningbolt', 4],
        ['counterspell', 2],
      ];
      localStorage.setItem('mtg-collection', JSON.stringify(data));

      // Configure and create a new service instance
      TestBed.configureTestingModule({});
      const newService = TestBed.inject(CollectionService);

      // The service should have loaded from localStorage on creation
      expect(newService.collection().get('lightningbolt')).toBe(4);
      expect(newService.collection().get('counterspell')).toBe(2);
    });

    it('should clear localStorage when clearCollection is called', () => {
      service.parseCollection('4 Lightning Bolt');
      expect(localStorage.getItem('mtg-collection')).not.toBeNull();

      service.clearCollection();

      expect(localStorage.getItem('mtg-collection')).toBeNull();
      expect(service.collection().size).toBe(0);
    });
  });

  describe('uniqueCardCount', () => {
    it('should return 0 for empty collection', () => {
      expect(service.uniqueCardCount()).toBe(0);
    });

    it('should return correct count of unique cards', () => {
      service.parseCollection('4 Lightning Bolt\n2 Counterspell\n1 Path to Exile');

      expect(service.uniqueCardCount()).toBe(3);
    });

    it('should not count duplicates multiple times', () => {
      service.parseCollection('4 Lightning Bolt\n4 LIGHTNING BOLT');

      // Both normalize to the same card, so unique count is 1
      expect(service.uniqueCardCount()).toBe(1);
    });

    it('should update reactively when collection changes', () => {
      expect(service.uniqueCardCount()).toBe(0);

      service.parseCollection('Lightning Bolt');
      expect(service.uniqueCardCount()).toBe(1);

      service.parseCollection('Counterspell\nPath to Exile');
      expect(service.uniqueCardCount()).toBe(2);

      service.clearCollection();
      expect(service.uniqueCardCount()).toBe(0);
    });
  });

  describe('collection signal', () => {
    it('should be a readonly signal', () => {
      const collection = service.collection;
      expect(collection()).toBeInstanceOf(Map);
    });

    it('should update when parseCollection is called', () => {
      expect(service.collection().size).toBe(0);

      service.parseCollection('Lightning Bolt');

      expect(service.collection().size).toBe(1);
      expect(service.collection().get('lightningbolt')).toBe(1);
    });
  });
});
