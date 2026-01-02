import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full h-4 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-300 rounded-full"
        [class]="barColorClass()"
        [style.width.%]="percent()">
      </div>
    </div>
    @if (showLabel()) {
      <span class="text-sm text-[var(--color-text-secondary)] mt-1">
        {{ percent() }}%
      </span>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
  `]
})
export class ProgressBarComponent {
  readonly percent = input.required<number>();
  readonly showLabel = input<boolean>(true);

  readonly barColorClass = computed(() => {
    const p = this.percent();
    if (p >= 70) {
      return 'bg-[var(--color-success)]';
    } else if (p >= 40) {
      return 'bg-[var(--color-warning)]';
    } else {
      return 'bg-[var(--color-danger)]';
    }
  });
}
