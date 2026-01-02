import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full h-5 progress-track rounded-full overflow-hidden">
      <div
        class="h-full transition-all duration-500 rounded-full"
        [class]="barColorClass()"
        [style.width.%]="percent()">
      </div>
    </div>
    @if (showLabel()) {
      <span class="text-sm mt-1.5 font-medium"
            [class]="labelColorClass()">
        {{ percent() }}% buildable
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
      return 'progress-success';
    } else if (p >= 40) {
      return 'progress-warning';
    } else {
      return 'progress-danger';
    }
  });

  readonly labelColorClass = computed(() => {
    const p = this.percent();
    if (p >= 70) {
      return 'text-[var(--color-success)]';
    } else if (p >= 40) {
      return 'text-[var(--color-warning)]';
    } else {
      return 'text-[var(--color-danger)]';
    }
  });
}
