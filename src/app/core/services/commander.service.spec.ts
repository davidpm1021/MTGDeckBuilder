import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CommanderService } from './commander.service';
import { CommanderData } from '../models/types';

describe('CommanderService', () => {
  let service: CommanderService;
  let httpMock: HttpTestingController;

  const mockCommanderData: CommanderData = {
    updatedAt: '2025-01-15',
    commanders: [
      {
        name: "Atraxa, Praetors' Voice",
        slug: 'atraxa-praetors-voice',
        colorIdentity: ['W', 'U', 'B', 'G'],
        numDecks: 15234,
        cards: ['Sol Ring', 'Arcane Signet', 'Command Tower'],
      },
      {
        name: 'Edgar Markov',
        slug: 'edgar-markov',
        colorIdentity: ['W', 'B', 'R'],
        numDecks: 12456,
        cards: ['Sol Ring', 'Blood Artist', 'Captivating Vampire'],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommanderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadCommanders', () => {
    it('should load commanders from JSON successfully', async () => {
      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockCommanderData);

      await loadPromise;

      expect(service.commanders().length).toBe(2);
      expect(service.commanders()[0].name).toBe("Atraxa, Praetors' Voice");
      expect(service.commanders()[1].name).toBe('Edgar Markov');
    });

    it('should set dataUpdatedAt from JSON', async () => {
      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush(mockCommanderData);

      await loadPromise;

      expect(service.dataUpdatedAt()).toBe('2025-01-15');
    });

    it('should handle HTTP errors gracefully', async () => {
      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).rejects.toBeTruthy();
    });

    it('should update commanders signal after load', async () => {
      // Before load, commanders should be empty
      expect(service.commanders()).toEqual([]);

      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush(mockCommanderData);

      await loadPromise;

      // After load, commanders should be populated
      expect(service.commanders().length).toBe(2);
    });

    it('should cache results and not make duplicate requests', async () => {
      // First load
      const loadPromise1 = service.loadCommanders();
      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush(mockCommanderData);
      await loadPromise1;

      // Second load - should not make another request
      await service.loadCommanders();

      // No additional requests should have been made
      httpMock.expectNone('/assets/data/commanders.json');
    });

    it('should preserve commander card arrays', async () => {
      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush(mockCommanderData);

      await loadPromise;

      const atraxa = service.commanders()[0];
      expect(atraxa.cards.length).toBe(3);
      expect(atraxa.cards).toContain('Sol Ring');
      expect(atraxa.cards).toContain('Arcane Signet');
      expect(atraxa.cards).toContain('Command Tower');
    });

    it('should preserve color identity arrays', async () => {
      const loadPromise = service.loadCommanders();

      const req = httpMock.expectOne('/assets/data/commanders.json');
      req.flush(mockCommanderData);

      await loadPromise;

      const atraxa = service.commanders()[0];
      expect(atraxa.colorIdentity).toEqual(['W', 'U', 'B', 'G']);

      const edgar = service.commanders()[1];
      expect(edgar.colorIdentity).toEqual(['W', 'B', 'R']);
    });
  });
});
