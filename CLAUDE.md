# CLAUDE.md - MTG Deck Builder Conventions

## Project Overview

Angular 19 web app that matches a user's MTG card collection against EDHREC commander decklists to show buildability percentages.

## Tech Stack

- **Framework:** Angular 19 (standalone components, signals)
- **Styling:** Tailwind CSS 4
- **Testing:** Jest + Testing Library
- **Build:** Vite (Angular CLI default)
- **Data:** Static JSON, no backend

## Critical Rules

### Angular Patterns (MUST FOLLOW)

- **Standalone components only** - never use NgModules
- **Do NOT set `standalone: true`** - it's the default in Angular 19
- **Signals for all state** - no BehaviorSubjects or manual subscriptions
- **`inject()` function** - never constructor injection
- **Native control flow** - `@if`, `@for`, `@switch` - never `*ngIf`, `*ngFor`
- **OnPush change detection** - on every component
- **`input()` and `output()` functions** - never `@Input()` or `@Output()` decorators

### TypeScript

- Strict mode enabled - no `any` types
- Explicit return types on all functions
- Use `readonly` for immutable properties
- Prefer `interface` over `type` for object shapes

### Code Style

- ES modules (import/export)
- Single responsibility - one component/service per file
- Max 150 lines per file - split if larger
- Descriptive variable names - no abbreviations

### Testing

- Test files colocated: `foo.service.spec.ts` next to `foo.service.ts`
- Use Testing Library patterns, not Angular TestBed directly
- Property-based tests for parser functions
- Mock HTTP with `provideHttpClientTesting()`

## Commands

```bash
# Development
ng serve                    # Start dev server at localhost:4200
ng test                     # Run Jest tests
ng test --watch             # Run tests in watch mode
ng lint                     # Run ESLint

# Build
ng build                    # Production build to dist/

# Generate
ng g c features/foo         # Generate component
ng g s core/services/foo    # Generate service
```

## Project Structure

```
src/app/
├── core/           # Singleton services, models
│   ├── services/   # CollectionService, CommanderService, DeckMatcherService
│   └── models/     # TypeScript interfaces
├── features/       # Feature components (collection-input, filters, results)
└── shared/         # Reusable dumb components
```

## Patterns to Follow

### Service Pattern

```typescript
@Injectable({ providedIn: "root" })
export class ExampleService {
  private readonly http = inject(HttpClient);

  // Use signals for reactive state
  private readonly _items = signal<Item[]>([]);
  readonly items = this._items.asReadonly();

  // Computed for derived state
  readonly itemCount = computed(() => this._items().length);
}
```

### Component Pattern

```typescript
@Component({
  selector: "app-example",
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
    <p>Loading...</p>
    } @else { @for (item of items(); track item.id) {
    <div>{{ item.name }}</div>
    } }
  `,
})
export class ExampleComponent {
  private readonly service = inject(ExampleService);

  // Signal inputs (Angular 17.1+)
  readonly data = input.required<Data>();

  // Signal outputs
  readonly selected = output<Item>();

  // Local signals
  readonly loading = signal(false);

  // Computed from service
  readonly items = this.service.items;
}
```

### Test Pattern

```typescript
describe("ExampleService", () => {
  let service: ExampleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExampleService],
    });
    service = TestBed.inject(ExampleService);
  });

  it("should parse collection correctly", () => {
    const result = service.parseCollection("4 Lightning Bolt");
    expect(result.get("lightningbolt")).toBe(4);
  });
});
```

## Shortcuts

### PLAN

Before implementing, create a step-by-step plan. Do not write code until I approve.

### EXPLORE

Read the relevant files first. Understand existing patterns before making changes.

### TEST_FIRST

Write failing tests before implementation. Commit tests separately.

## Card Name Normalization Rules

When comparing card names:

1. Convert to lowercase
2. Remove all non-alphanumeric characters
3. Trim whitespace
4. Handle split cards: "Fire // Ice" normalizes to "fireice"

## Color Identity Order

Always use WUBRG order: White, Blue, Black, Red, Green

- Correct: `['W', 'U', 'B']`
- Wrong: `['B', 'U', 'W']`

## File Naming

- Components: `kebab-case.component.ts`
- Services: `kebab-case.service.ts`
- Models: `types.ts` (single file for related types)
- Tests: `*.spec.ts` (colocated)

## Git Workflow

- Feature branches: `feature/collection-parser`
- Commit often, small logical units
- Descriptive commit messages: "feat(collection): add CSV parsing support"
- Never commit to main directly
