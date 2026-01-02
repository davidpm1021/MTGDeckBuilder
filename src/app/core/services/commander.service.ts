import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Commander, CommanderData } from '../models/types';

/**
 * Service for loading and caching commander data from the static JSON file.
 * Provides reactive signals for commander data and metadata.
 */
@Injectable({ providedIn: 'root' })
export class CommanderService {
  private readonly http = inject(HttpClient);
  private readonly commandersUrl = 'assets/data/commanders.json';

  private readonly _commanders = signal<Commander[]>([]);
  private readonly _dataUpdatedAt = signal<string>('');
  private _loaded = false;

  /** Signal containing loaded commander data */
  readonly commanders = this._commanders.asReadonly();

  /** Signal containing the date when commander data was last updated */
  readonly dataUpdatedAt = this._dataUpdatedAt.asReadonly();

  /**
   * Loads commanders from the JSON file.
   * Caches the result so subsequent calls are no-ops.
   * Should be called during app initialization.
   */
  async loadCommanders(): Promise<void> {
    if (this._loaded) {
      return;
    }

    const data = await firstValueFrom(
      this.http.get<CommanderData>(this.commandersUrl)
    );

    this._commanders.set([...data.commanders]);
    this._dataUpdatedAt.set(data.updatedAt);
    this._loaded = true;
  }
}
