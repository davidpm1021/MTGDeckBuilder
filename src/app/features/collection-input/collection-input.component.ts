import { Component, ChangeDetectionStrategy, signal, output, inject } from '@angular/core';
import { CollectionService } from '@app/core/services/collection.service';

type InputMode = 'paste' | 'upload';

@Component({
  selector: 'app-collection-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <!-- Tab Selector -->
      <div class="flex border-b border-[var(--color-bg-primary)] mb-4">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class]="activeMode() === 'paste' ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
          (click)="setMode('paste')">
          Paste Collection
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class]="activeMode() === 'upload' ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
          (click)="setMode('upload')">
          Upload CSV
        </button>
      </div>

      <!-- Paste Mode -->
      @if (activeMode() === 'paste') {
        <div>
          <textarea
            class="w-full h-48 bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-bg-primary)] rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-[var(--color-accent-gold)]"
            [placeholder]="placeholderText"
            [value]="textContent()"
            (input)="onTextInput($event)">
          </textarea>
          <button
            type="button"
            class="mt-3 px-4 py-2 bg-[var(--color-accent-gold)] text-[var(--color-bg-primary)] rounded font-medium text-sm hover:bg-[var(--color-accent-gold-dim)] transition-colors disabled:opacity-50"
            [disabled]="!textContent().trim()"
            (click)="parseTextInput()">
            Parse Collection
          </button>
        </div>
      }

      <!-- Upload Mode -->
      @if (activeMode() === 'upload') {
        <div
          class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer"
          [class]="isDragging() ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-card)]' : 'border-[var(--color-bg-primary)] hover:border-[var(--color-text-secondary)]'"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          <input
            #fileInput
            type="file"
            accept=".csv,.txt"
            class="hidden"
            (change)="onFileSelected($event)" />
          <div class="text-[var(--color-text-secondary)]">
            <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="text-sm">
              @if (isDragging()) {
                Drop your file here
              } @else {
                Drag and drop a CSV file, or click to browse
              }
            </p>
            <p class="text-xs mt-2 text-[var(--color-text-secondary)]">
              Supports .csv and .txt files
            </p>
          </div>
        </div>
        @if (fileName()) {
          <p class="mt-2 text-sm text-[var(--color-text-secondary)]">
            Selected: {{ fileName() }}
          </p>
        }
      }

      <!-- Stats Bar -->
      @if (uniqueCardCount() > 0) {
        <div class="mt-4 pt-4 border-t border-[var(--color-bg-primary)]">
          <p class="text-sm text-[var(--color-accent-gold)] font-medium">
            {{ uniqueCardCount() }} unique cards parsed
          </p>
        </div>
      }
    </div>
  `
})
export class CollectionInputComponent {
  private readonly collectionService = inject(CollectionService);

  readonly collectionParsed = output<Map<string, number>>();

  readonly activeMode = signal<InputMode>('paste');
  readonly textContent = signal('');
  readonly isDragging = signal(false);
  readonly fileName = signal('');
  readonly uniqueCardCount = this.collectionService.uniqueCardCount;

  readonly placeholderText = `Enter your card collection, one card per line.

Supported formats:
  Lightning Bolt
  4 Lightning Bolt
  4x Counterspell
  4,Sol Ring,C21

Lines starting with # or // are ignored.`;

  setMode(mode: InputMode): void {
    this.activeMode.set(mode);
  }

  onTextInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.textContent.set(target.value);
  }

  parseTextInput(): void {
    const text = this.textContent();
    if (text.trim()) {
      const collection = this.collectionService.parseCollection(text);
      this.collectionParsed.emit(collection);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private processFile(file: File): void {
    this.fileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        const collection = this.collectionService.parseCollection(content);
        this.collectionParsed.emit(collection);
      }
    };
    reader.readAsText(file);
  }
}
