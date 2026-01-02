# MTG Deck Builder

A web app that matches your Magic: The Gathering card collection against EDHREC commander decklists to show which decks you can build.

## Features

- **Collection Import**: Paste card lists, upload CSV files, or import from Archidekt URLs
- **Commander Matching**: See buildability percentages for 5,900+ commanders
- **Smart Filtering**: Filter by color identity, minimum percentage, and sort options
- **Detailed Breakdowns**: View owned vs missing cards for each commander
- **MTG-Themed UI**: Fantasy-inspired dark theme with card frame styling

## Tech Stack

- **Framework**: Angular 19 (standalone components, signals, OnPush)
- **Styling**: Tailwind CSS 4
- **Testing**: Jest + Testing Library
- **Build**: Vite via Angular CLI
- **Data**: Static JSON from EDHREC (no backend required)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Run tests
ng test

# Production build
ng build
```

The app runs at `http://localhost:4200/`

## Data & Scraping

Commander deck data is sourced from [EDHREC](https://edhrec.com) and stored in `src/assets/data/commanders.json`.

### Manual Scrape

```bash
# Fetch all commanders (~30 min for 5,900+ commanders)
python scripts/fetch-edhrec-data.py

# Use cached slugs for faster re-runs
python scripts/fetch-edhrec-data.py --skip-fetch-slugs
```

### Current Data Status

| Metric | Value |
|--------|-------|
| Commanders available | ~5,960 |
| Currently scraped | 191 |
| Last updated | See `commanders.json` |

### Automated Scraping (TODO)

GitHub Actions workflow for weekly updates is planned but not yet implemented.

## Project Structure

```
src/app/
├── core/
│   ├── models/types.ts          # TypeScript interfaces
│   └── services/                # CollectionService, CommanderService, DeckMatcherService
├── features/
│   ├── collection-input/        # Card collection input component
│   ├── filters/                 # Color/sort filter component
│   └── results/                 # Commander cards grid + progress bars
└── app.ts                       # Root component

scripts/
└── fetch-edhrec-data.py         # EDHREC scraper
```

## Card Format Support

The collection parser accepts multiple formats:

```
Lightning Bolt           # Card name only
4 Lightning Bolt         # Quantity + name
4x Counterspell          # Quantity with 'x'
4,Sol Ring,C21           # CSV format
```

Lines starting with `#` or `//` are ignored as comments.

## Contributing

See [CLAUDE.md](./CLAUDE.md) for coding conventions and patterns.

## License

MIT
