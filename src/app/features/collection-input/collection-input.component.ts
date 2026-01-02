import { Component, ChangeDetectionStrategy, signal, output, inject } from '@angular/core';
import { CollectionService } from '@app/core/services/collection.service';
import { ArchidektService } from '@app/core/services/archidekt.service';

type InputMode = 'paste' | 'upload' | 'url';

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
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors"
          [class]="activeMode() === 'url' ? 'text-[var(--color-accent-gold)] border-b-2 border-[var(--color-accent-gold)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'"
          (click)="setMode('url')">
          Archidekt URL
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
          role="button"
          tabindex="0"
          aria-label="Upload CSV file - click or press Enter to browse"
          class="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer focus:outline-none focus:border-[var(--color-accent-gold)]"
          [class]="isDragging() ? 'border-[var(--color-accent-gold)] bg-[var(--color-bg-card)]' : 'border-[var(--color-bg-primary)] hover:border-[var(--color-text-secondary)]'"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
          (keydown.enter)="fileInput.click()"
          (keydown.space)="fileInput.click(); $event.preventDefault()">
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

      <!-- URL Mode -->
      @if (activeMode() === 'url') {
        <div>
          <div class="flex gap-2">
            <input
              type="url"
              class="flex-1 bg-[var(--color-bg-card)] text-[var(--color-text-primary)] border border-[var(--color-bg-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-gold)]"
              placeholder="https://archidekt.com/decks/123456"
              [value]="urlInput()"
              (input)="onUrlInput($event)"
              (keydown.enter)="fetchArchidektDeck()" />
            <button
              type="button"
              class="px-4 py-2 bg-[var(--color-accent-gold)] text-[var(--color-bg-primary)] rounded font-medium text-sm hover:bg-[var(--color-accent-gold-dim)] transition-colors disabled:opacity-50"
              [disabled]="!isValidUrl() || urlLoading()"
              (click)="fetchArchidektDeck()">
              @if (urlLoading()) {
                <span class="inline-flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              } @else {
                Import
              }
            </button>
          </div>

          <p class="mt-3 text-xs text-[var(--color-text-secondary)]">
            Tip: Create a public deck in Archidekt containing your collection cards, then paste the URL here.
          </p>

          @if (urlError()) {
            <div class="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p class="text-sm text-red-400">{{ urlError() }}</p>
            </div>
          }

          @if (urlSuccess()) {
            <div class="mt-3 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
              <p class="text-sm text-green-400">{{ urlSuccess() }}</p>
            </div>
          }
        </div>
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
  private readonly archidektService = inject(ArchidektService);

  readonly collectionParsed = output<Map<string, number>>();

  readonly activeMode = signal<InputMode>('paste');
  readonly textContent = signal('');
  readonly isDragging = signal(false);
  readonly fileName = signal('');
  readonly uniqueCardCount = this.collectionService.uniqueCardCount;

  // URL mode state
  readonly urlInput = signal('');
  readonly urlLoading = signal(false);
  readonly urlError = signal('');
  readonly urlSuccess = signal('');

  readonly placeholderText = `Enter your card collection, one card per line.

Supported formats:
  Lightning Bolt
  4 Lightning Bolt
  4x Counterspell
  4,Sol Ring,C21

Lines starting with # or // are ignored.`;

  setMode(mode: InputMode): void {
    this.activeMode.set(mode);
    this.urlError.set('');
    this.urlSuccess.set('');
  }

  isValidUrl(): boolean {
    return this.archidektService.isValidArchidektUrl(this.urlInput());
  }

  onUrlInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.urlInput.set(target.value);
    this.urlError.set('');
    this.urlSuccess.set('');
  }

  async fetchArchidektDeck(): Promise<void> {
    const url = this.urlInput();
    const deckId = this.archidektService.extractDeckId(url);

    if (!deckId) {
      this.urlError.set('Invalid Archidekt URL. Please use a URL like: https://archidekt.com/decks/123456');
      return;
    }

    this.urlLoading.set(true);
    this.urlError.set('');
    this.urlSuccess.set('');

    try {
      const cards = await this.archidektService.fetchDeck(deckId);

      // Convert to collection text format and parse
      const collectionText = cards
        .map(card => `${card.quantity} ${card.name}`)
        .join('\n');

      const collection = this.collectionService.parseCollection(collectionText);
      this.collectionParsed.emit(collection);

      this.urlSuccess.set(`Imported ${cards.length} unique cards from Archidekt`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch deck';
      if (message.includes('404') || message.includes('not found')) {
        this.urlError.set('Deck not found. Make sure the deck exists and is public.');
      } else if (message.includes('network') || message.includes('fetch')) {
        this.urlError.set('Network error. Please check your connection and try again.');
      } else {
        this.urlError.set(message);
      }
    } finally {
      this.urlLoading.set(false);
    }
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
