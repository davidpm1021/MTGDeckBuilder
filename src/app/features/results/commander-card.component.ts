import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { MatchedCommander, ColorIdentity } from '@app/core/models/types';
import { ProgressBarComponent } from './progress-bar.component';

@Component({
  selector: 'app-commander-card',
  imports: [ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      role="button"
      tabindex="0"
      [attr.aria-expanded]="expanded()"
      [attr.aria-label]="matchedCommander().commander.name + ' - ' + matchedCommander().match.percent + '% buildable'"
      class="bg-[var(--color-bg-card)] rounded-lg p-4 border border-[var(--color-bg-secondary)] hover:border-[var(--color-accent-gold)] transition-colors cursor-pointer focus:outline-none focus:border-[var(--color-accent-gold)]"
      (click)="toggleExpanded()"
      (keydown.enter)="toggleExpanded()"
      (keydown.space)="toggleExpanded(); $event.preventDefault()">

      <!-- Header -->
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-lg font-semibold text-[var(--color-text-primary)] leading-tight">
          {{ matchedCommander().commander.name }}
        </h3>
        <div class="flex gap-1 ml-2 flex-shrink-0">
          @for (color of matchedCommander().commander.colorIdentity; track color) {
            <span
              class="w-5 h-5 rounded-full border border-[var(--color-bg-secondary)] flex items-center justify-center text-xs font-bold"
              [style.background-color]="getColorBackground(color)"
              [style.color]="getColorText(color)">
              {{ color }}
            </span>
          }
        </div>
      </div>

      <!-- Progress Bar -->
      <app-progress-bar
        [percent]="matchedCommander().match.percent"
        [showLabel]="true" />

      <!-- Stats -->
      <p class="text-sm text-[var(--color-text-secondary)] mt-2">
        {{ matchedCommander().match.owned }}/{{ matchedCommander().match.total }} cards
        ({{ matchedCommander().match.missing }} missing)
      </p>

      <!-- EDHREC Link -->
      <a
        [href]="edhrecUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block mt-3 text-sm text-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold-dim)] underline"
        (click)="$event.stopPropagation()">
        View on EDHREC
      </a>

      <!-- Expanded Section -->
      @if (expanded()) {
        <div class="mt-4 pt-4 border-t border-[var(--color-bg-secondary)]">
          <!-- Owned Cards -->
          <div class="mb-4">
            <h4 class="text-sm font-semibold text-[var(--color-success)] mb-2">
              Owned Cards ({{ matchedCommander().match.ownedCards.length }})
            </h4>
            <div class="flex flex-wrap gap-1">
              @for (card of displayedOwnedCards(); track card) {
                <span class="text-xs px-2 py-1 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text-secondary)]">
                  {{ card }}
                </span>
              }
              @if (matchedCommander().match.ownedCards.length > 10) {
                <span class="text-xs px-2 py-1 text-[var(--color-text-secondary)]">
                  +{{ matchedCommander().match.ownedCards.length - 10 }} more
                </span>
              }
            </div>
          </div>

          <!-- Missing Cards -->
          <div>
            <h4 class="text-sm font-semibold text-[var(--color-danger)] mb-2">
              Missing Cards ({{ matchedCommander().match.missingCards.length }})
            </h4>
            <div class="flex flex-wrap gap-1">
              @for (card of displayedMissingCards(); track card) {
                <span class="text-xs px-2 py-1 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text-secondary)]">
                  {{ card }}
                </span>
              }
              @if (matchedCommander().match.missingCards.length > 10) {
                <span class="text-xs px-2 py-1 text-[var(--color-text-secondary)]">
                  +{{ matchedCommander().match.missingCards.length - 10 }} more
                </span>
              }
            </div>
          </div>
        </div>
      }
    </article>
  `
})
export class CommanderCardComponent {
  readonly matchedCommander = input.required<MatchedCommander>();

  readonly expanded = signal(false);

  readonly edhrecUrl = computed(() => {
    return `https://edhrec.com/commanders/${this.matchedCommander().commander.slug}`;
  });

  readonly displayedOwnedCards = computed(() => {
    return this.matchedCommander().match.ownedCards.slice(0, 10);
  });

  readonly displayedMissingCards = computed(() => {
    return this.matchedCommander().match.missingCards.slice(0, 10);
  });

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }

  getColorBackground(color: ColorIdentity): string {
    const colors: Record<ColorIdentity, string> = {
      'W': 'var(--color-mtg-white)',
      'U': 'var(--color-mtg-blue)',
      'B': 'var(--color-mtg-black)',
      'R': 'var(--color-mtg-red)',
      'G': 'var(--color-mtg-green)'
    };
    return colors[color];
  }

  getColorText(color: ColorIdentity): string {
    // White and light colors need dark text
    if (color === 'W') {
      return '#000000';
    }
    return '#ffffff';
  }
}
