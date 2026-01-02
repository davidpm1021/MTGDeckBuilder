import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { MatchedCommander, ColorIdentity, CardMatchInfo } from '@app/core/models/types';
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
      class="mtg-frame p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1"
      [style.box-shadow]="'var(--shadow-card)'"
      (mouseenter)="onHover(true)"
      (mouseleave)="onHover(false)"
      (focus)="onHover(true)"
      (blur)="onHover(false)"
      (click)="toggleExpanded()"
      (keydown.enter)="toggleExpanded()"
      (keydown.space)="toggleExpanded(); $event.preventDefault()">

      <!-- Header -->
      <div class="flex justify-between items-start mb-3">
        <h3 class="text-lg font-semibold text-[var(--color-text-primary)] leading-tight"
            style="font-family: var(--font-heading);">
          {{ matchedCommander().commander.name }}
        </h3>
        <div class="flex gap-1.5 ml-2 flex-shrink-0">
          @for (color of matchedCommander().commander.colorIdentity; track color) {
            <span
              class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              [style.background-color]="getColorBackground(color)"
              [style.color]="getColorText(color)"
              [style.box-shadow]="'0 0 6px ' + getColorGlow(color)"
              [style.border]="'1px solid rgba(255,255,255,0.2)'">
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
      <p class="text-sm text-[var(--color-text-secondary)] mt-3">
        <span class="text-[var(--color-text-primary)]">{{ matchedCommander().match.owned }}</span>/{{ matchedCommander().match.total }} cards
        · <span class="text-[var(--color-danger)]">{{ matchedCommander().match.missing }}</span> missing
      </p>

      <!-- EDHREC Link -->
      <a
        [href]="edhrecUrl()"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block mt-3 text-sm text-[var(--color-gold-primary)] hover:text-[var(--color-gold-bright)] transition-colors"
        (click)="$event.stopPropagation()">
        View on EDHREC &rarr;
      </a>

      <!-- Expanded Section -->
      @if (expanded()) {
        <div class="mt-4 pt-4 border-t border-[var(--color-gold-dark)]/30">
          <!-- Owned Cards -->
          <div class="mb-4">
            <h4 class="text-sm font-semibold text-[var(--color-success)] mb-2">
              Owned Cards ({{ ownedCardSlots() }} slots)
            </h4>
            <div class="flex flex-wrap gap-1.5">
              @for (card of displayedOwnedCards(); track card.name) {
                <span class="text-xs px-2 py-1 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded text-[var(--color-text-primary)]">
                  {{ formatOwnedCard(card) }}
                </span>
              }
              @if (matchedCommander().match.ownedCards.length > 10) {
                <span class="text-xs px-2 py-1 text-[var(--color-text-muted)]">
                  +{{ matchedCommander().match.ownedCards.length - 10 }} more
                </span>
              }
            </div>
          </div>

          <!-- Missing Cards -->
          <div>
            <h4 class="text-sm font-semibold text-[var(--color-danger)] mb-2">
              Missing Cards ({{ missingCardSlots() }} slots)
            </h4>
            <div class="flex flex-wrap gap-1.5">
              @for (card of displayedMissingCards(); track card.name) {
                <span class="text-xs px-2 py-1 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded text-[var(--color-text-primary)]">
                  {{ formatMissingCard(card) }}
                </span>
              }
              @if (matchedCommander().match.missingCards.length > 10) {
                <span class="text-xs px-2 py-1 text-[var(--color-text-muted)]">
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
  readonly isHovered = signal(false);

  readonly edhrecUrl = computed(() => {
    return `https://edhrec.com/commanders/${this.matchedCommander().commander.slug}`;
  });

  readonly displayedOwnedCards = computed(() => {
    return this.matchedCommander().match.ownedCards.slice(0, 10);
  });

  readonly displayedMissingCards = computed(() => {
    return this.matchedCommander().match.missingCards.slice(0, 10);
  });

  readonly ownedCardSlots = computed(() => {
    return this.matchedCommander().match.ownedCards.reduce(
      (sum, card) => sum + card.owned, 0
    );
  });

  readonly missingCardSlots = computed(() => {
    return this.matchedCommander().match.missingCards.reduce(
      (sum, card) => sum + (card.required - card.owned), 0
    );
  });

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }

  onHover(hovered: boolean): void {
    this.isHovered.set(hovered);
  }

  formatOwnedCard(card: CardMatchInfo): string {
    // Show quantity only if more than 1 required
    if (card.required > 1) {
      return `${card.name} (${card.owned}/${card.required})`;
    }
    return card.name;
  }

  formatMissingCard(card: CardMatchInfo): string {
    const missingQty = card.required - card.owned;
    // Show quantity only if more than 1 missing
    if (missingQty > 1) {
      return `${card.name} (need ${missingQty})`;
    }
    if (card.required > 1 && card.owned > 0) {
      // Partial: have some but not all
      return `${card.name} (${card.owned}/${card.required})`;
    }
    return card.name;
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

  getColorGlow(color: ColorIdentity): string {
    const glows: Record<ColorIdentity, string> = {
      'W': 'rgba(248, 246, 232, 0.5)',
      'U': 'rgba(14, 104, 171, 0.5)',
      'B': 'rgba(75, 50, 40, 0.5)',
      'R': 'rgba(211, 32, 42, 0.5)',
      'G': 'rgba(0, 115, 62, 0.5)'
    };
    return glows[color];
  }
}
