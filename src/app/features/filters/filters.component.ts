import { Component, ChangeDetectionStrategy, signal, output } from '@angular/core';
import { ColorIdentity, Filters, SortOption } from '@app/core/models/types';

interface ColorButton {
  readonly color: ColorIdentity;
  readonly label: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly glowVar: string;
}

@Component({
  selector: 'app-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mtg-frame flex flex-wrap items-center gap-5 p-5">
      <!-- Color Filters -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-[var(--color-text-secondary)]">Colors:</span>
        @for (btn of colorButtons; track btn.color) {
          <button
            type="button"
            class="w-9 h-9 rounded-full border-2 transition-all font-bold text-sm flex items-center justify-center"
            [class]="isColorSelected(btn.color) ? 'scale-110' : 'opacity-50 hover:opacity-80 hover:scale-105'"
            [style.background-color]="btn.bgColor"
            [style.color]="btn.textColor"
            [style.border-color]="btn.color === 'B' ? 'var(--color-text-secondary)' : 'transparent'"
            [style.box-shadow]="isColorSelected(btn.color) ? 'var(' + btn.glowVar + '), 0 0 0 3px var(--color-bg-card)' : 'none'"
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
          class="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-2 border-[var(--color-gold-dark)]/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors cursor-pointer"
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
          class="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-2 border-[var(--color-gold-dark)]/40 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-gold-primary)] transition-colors cursor-pointer"
          [value]="sortBy()"
          (change)="onSortChange($event)">
          @for (option of sortOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
      </div>

      <!-- Require Commander Toggle -->
      <label class="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          [checked]="requireCommander()"
          (change)="onRequireCommanderChange($event)"
          class="w-4 h-4 accent-[var(--color-gold-primary)] cursor-pointer" />
        <span class="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">Own commander</span>
      </label>
    </div>
  `
})
export class FiltersComponent {
  readonly filtersChanged = output<Filters>();

  readonly selectedColors = signal<readonly ColorIdentity[]>([]);
  readonly minPercent = signal<number>(0);
  readonly sortBy = signal<SortOption>('percent');
  readonly requireCommander = signal<boolean>(false);

  readonly colorButtons: readonly ColorButton[] = [
    { color: 'W', label: 'White', bgColor: 'var(--color-mtg-white)', textColor: '#000', glowVar: '--glow-mtg-white' },
    { color: 'U', label: 'Blue', bgColor: 'var(--color-mtg-blue)', textColor: '#fff', glowVar: '--glow-mtg-blue' },
    { color: 'B', label: 'Black', bgColor: 'var(--color-mtg-black)', textColor: '#fff', glowVar: '--glow-mtg-black' },
    { color: 'R', label: 'Red', bgColor: 'var(--color-mtg-red)', textColor: '#fff', glowVar: '--glow-mtg-red' },
    { color: 'G', label: 'Green', bgColor: 'var(--color-mtg-green)', textColor: '#fff', glowVar: '--glow-mtg-green' }
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

  onRequireCommanderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.requireCommander.set(target.checked);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      colors: this.selectedColors(),
      minPercent: this.minPercent(),
      sortBy: this.sortBy(),
      requireCommander: this.requireCommander()
    });
  }
}
