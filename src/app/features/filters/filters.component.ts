import { Component, ChangeDetectionStrategy, signal, output, computed } from '@angular/core';
import { ColorIdentity, Filters, SortOption } from '@app/core/models/types';

interface ColorButton {
  readonly color: ColorIdentity;
  readonly label: string;
  readonly bgColor: string;
  readonly textColor: string;
}

@Component({
  selector: 'app-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
      <!-- Color Filters -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-[var(--color-text-secondary)] mr-1">Colors:</span>
        @for (btn of colorButtons; track btn.color) {
          <button
            type="button"
            class="w-8 h-8 rounded-full border-2 transition-all font-bold text-sm flex items-center justify-center"
            [class]="isColorSelected(btn.color) ? 'ring-2 ring-[var(--color-accent-gold)] ring-offset-2 ring-offset-[var(--color-bg-secondary)]' : 'opacity-50 hover:opacity-75'"
            [style.background-color]="btn.bgColor"
            [style.color]="btn.textColor"
            [style.border-color]="btn.color === 'B' ? 'var(--color-text-secondary)' : 'transparent'"
            (click)="toggleColor(btn.color)"
            [attr.aria-pressed]="isColorSelected(btn.color)"
            [attr.aria-label]="'Toggle ' + btn.label">
            {{ btn.color }}
          </button>
        }
      </div>

      <!-- Min Percent Dropdown -->
      <div class="flex items-center gap-2">
        <label for="min-percent" class="text-sm text-[var(--color-text-secondary)]">Min %:</label>
        <select
          id="min-percent"
          class="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-bg-primary)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
          [value]="minPercent()"
          (change)="onMinPercentChange($event)">
          @for (option of percentOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      <!-- Sort Dropdown -->
      <div class="flex items-center gap-2">
        <label for="sort-by" class="text-sm text-[var(--color-text-secondary)]">Sort:</label>
        <select
          id="sort-by"
          class="bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-bg-primary)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
          [value]="sortBy()"
          (change)="onSortChange($event)">
          @for (option of sortOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>
    </div>
  `
})
export class FiltersComponent {
  readonly filtersChanged = output<Filters>();

  readonly selectedColors = signal<readonly ColorIdentity[]>([]);
  readonly minPercent = signal<number>(0);
  readonly sortBy = signal<SortOption>('percent');

  readonly colorButtons: readonly ColorButton[] = [
    { color: 'W', label: 'White', bgColor: 'var(--color-mtg-white)', textColor: '#000000' },
    { color: 'U', label: 'Blue', bgColor: 'var(--color-mtg-blue)', textColor: '#ffffff' },
    { color: 'B', label: 'Black', bgColor: 'var(--color-mtg-black)', textColor: '#ffffff' },
    { color: 'R', label: 'Red', bgColor: 'var(--color-mtg-red)', textColor: '#ffffff' },
    { color: 'G', label: 'Green', bgColor: 'var(--color-mtg-green)', textColor: '#ffffff' }
  ];

  readonly percentOptions = [
    { value: 0, label: '0%' },
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 70, label: '70%' },
    { value: 90, label: '90%' }
  ];

  readonly sortOptions: readonly { value: SortOption; label: string }[] = [
    { value: 'percent', label: '% Buildable' },
    { value: 'owned', label: 'Cards Owned' },
    { value: 'missing', label: 'Fewest Missing' },
    { value: 'popularity', label: 'Popularity' }
  ];

  isColorSelected(color: ColorIdentity): boolean {
    return this.selectedColors().includes(color);
  }

  toggleColor(color: ColorIdentity): void {
    this.selectedColors.update(colors => {
      if (colors.includes(color)) {
        return colors.filter(c => c !== color);
      }
      return [...colors, color];
    });
    this.emitFilters();
  }

  onMinPercentChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.minPercent.set(Number(target.value));
    this.emitFilters();
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy.set(target.value as SortOption);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      colors: this.selectedColors(),
      minPercent: this.minPercent(),
      sortBy: this.sortBy()
    });
  }
}
