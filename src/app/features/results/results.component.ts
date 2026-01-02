import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { MatchedCommander } from '@app/core/models/types';
import { CommanderCardComponent } from './commander-card.component';

@Component({
  selector: 'app-results',
  imports: [CommanderCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-xl font-semibold text-[var(--color-text-primary)]"
            style="font-family: var(--font-heading);">
          <span class="text-[var(--color-gold-primary)]">{{ matchedCommanders().length }}</span>
          commanders match your filters
        </h2>
      </div>

      <!-- Results Grid -->
      @if (matchedCommanders().length > 0) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (commander of matchedCommanders(); track commander.commander.slug) {
            <app-commander-card [matchedCommander]="commander" />
          }
        </div>
      } @else {
        <div class="mtg-frame text-center py-16 px-8">
          <p class="text-lg text-[var(--color-text-primary)]">No commanders match your criteria.</p>
          <p class="mt-2 text-[var(--color-text-secondary)]">Try adjusting your filters or adding more cards to your collection.</p>
        </div>
      }
    </section>
  `
})
export class ResultsComponent {
  readonly matchedCommanders = input.required<readonly MatchedCommander[]>();
}
