import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommanderService } from '@app/core/services/commander.service';
import { CollectionService } from '@app/core/services/collection.service';
import { DeckMatcherService } from '@app/core/services/deck-matcher.service';
import { CollectionInputComponent } from '@app/features/collection-input/collection-input.component';
import { FiltersComponent } from '@app/features/filters/filters.component';
import { ResultsComponent } from '@app/features/results/results.component';
import { Filters, MatchedCommander } from '@app/core/models/types';

@Component({
  selector: 'app-root',
  imports: [
    CollectionInputComponent,
    FiltersComponent,
    ResultsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
      <!-- Header -->
      <header class="relative bg-[var(--color-bg-secondary)] py-5 px-6 border-b-2 border-[var(--color-gold-dark)]">
        <div class="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold-bright)] to-transparent"></div>
        <div class="max-w-7xl mx-auto">
          <h1 class="text-3xl font-bold text-[var(--color-gold-bright)] tracking-wide"
              style="font-family: var(--font-heading); text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);">
            MTG Deck Builder
          </h1>
          <p class="text-sm text-[var(--color-text-secondary)] mt-1">
            Discover which Commander decks you can build with your collection
          </p>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8">
        <!-- Collection Input -->
        <section>
          <h2 class="text-xl font-semibold text-[var(--color-text-primary)] mb-4"
              style="font-family: var(--font-heading);">
            Your Collection
          </h2>
          <app-collection-input
            (collectionParsed)="onCollectionParsed()" />
        </section>

        <!-- Filters -->
        @if (hasCollection()) {
          <section>
            <h2 class="text-xl font-semibold text-[var(--color-text-primary)] mb-4"
                style="font-family: var(--font-heading);">
              Filter Results
            </h2>
            <app-filters
              (filtersChanged)="onFiltersChanged($event)" />
          </section>
        }

        <!-- Results -->
        @if (hasCollection()) {
          @if (loading()) {
            <div class="text-center py-16">
              <div class="inline-block w-8 h-8 border-2 border-[var(--color-gold-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p class="text-[var(--color-text-secondary)]">Loading commanders...</p>
            </div>
          } @else {
            <app-results
              [matchedCommanders]="matchedCommanders()" />
          }
        } @else {
          <div class="mtg-frame text-center py-16 px-8">
            <p class="text-lg text-[var(--color-text-secondary)]">
              Add your card collection above to see which commanders you can build.
            </p>
          </div>
        }
      </main>

      <!-- Footer -->
      <footer class="relative bg-[var(--color-bg-secondary)] py-4 px-6 border-t-2 border-[var(--color-gold-dark)]">
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-gold-dim)] to-transparent"></div>
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <p>MTG Deck Builder</p>
          <div class="flex items-center gap-4">
            @if (dataUpdatedAt()) {
              <span class="text-[var(--color-text-muted)]">Data: {{ dataUpdatedAt() }}</span>
            }
            <a
              href="https://edhrec.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[var(--color-gold-primary)] hover:text-[var(--color-gold-bright)] transition-colors">
              Powered by EDHREC
            </a>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class App implements OnInit {
  private readonly commanderService = inject(CommanderService);
  private readonly collectionService = inject(CollectionService);
  private readonly deckMatcherService = inject(DeckMatcherService);

  readonly loading = signal(true);
  readonly filters = signal<Filters>({
    colors: [],
    minPercent: 0,
    sortBy: 'percent',
    requireCommander: false
  });

  readonly collection = this.collectionService.collection;
  readonly commanders = this.commanderService.commanders;
  readonly dataUpdatedAt = this.commanderService.dataUpdatedAt;

  readonly hasCollection = computed(() => this.collection().size > 0);

  readonly matchedCommanders = computed<readonly MatchedCommander[]>(() => {
    const cmds = this.commanders();
    const col = this.collection();
    const f = this.filters();

    if (cmds.length === 0 || col.size === 0) {
      return [];
    }

    return this.deckMatcherService.getFilteredResults(cmds, col, f);
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.commanderService.loadCommanders();
    } finally {
      this.loading.set(false);
    }
  }

  onCollectionParsed(): void {
    // Collection is already updated in the service
    // This callback can be used for additional side effects if needed
  }

  onFiltersChanged(newFilters: Filters): void {
    this.filters.set(newFilters);
  }
}
