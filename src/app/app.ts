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
    <div class="min-h-screen bg-[var(--color-bg-primary)]">
      <!-- Header -->
      <header class="bg-[var(--color-bg-secondary)] border-b border-[var(--color-bg-card)] py-4 px-6">
        <div class="max-w-7xl mx-auto">
          <h1 class="text-2xl font-bold text-[var(--color-accent-gold)]">
            MTG Deck Builder
          </h1>
          <p class="text-xs text-[var(--color-text-secondary)] mt-1">
            Discover which Commander decks you can build with your collection
          </p>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <!-- Collection Input -->
        <section>
          <h2 class="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
            Your Collection
          </h2>
          <app-collection-input
            (collectionParsed)="onCollectionParsed($event)" />
        </section>

        <!-- Filters -->
        @if (hasCollection()) {
          <section>
            <h2 class="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
              Filter Results
            </h2>
            <app-filters
              (filtersChanged)="onFiltersChanged($event)" />
          </section>
        }

        <!-- Results -->
        @if (hasCollection()) {
          @if (loading()) {
            <div class="text-center py-12">
              <p class="text-[var(--color-text-secondary)]">Loading commanders...</p>
            </div>
          } @else {
            <app-results
              [matchedCommanders]="matchedCommanders()" />
          }
        } @else {
          <div class="text-center py-12 bg-[var(--color-bg-secondary)] rounded-lg">
            <p class="text-[var(--color-text-secondary)]">
              Add your card collection above to see which commanders you can build.
            </p>
          </div>
        }
      </main>

      <!-- Footer -->
      <footer class="bg-[var(--color-bg-secondary)] border-t border-[var(--color-bg-card)] py-4 px-6 mt-8">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <p>
            MTG Deck Builder - Find commanders you can build with your collection
          </p>
          <div class="flex items-center gap-4">
            @if (dataUpdatedAt()) {
              <span>Data updated: {{ dataUpdatedAt() }}</span>
            }
            <a
              href="https://edhrec.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[var(--color-accent-gold)] hover:underline">
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
    sortBy: 'percent'
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
